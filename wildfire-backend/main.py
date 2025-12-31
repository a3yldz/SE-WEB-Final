from dotenv import load_dotenv
load_dotenv()

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import shape, Point
from typing import List, Dict, Any, Optional
import httpx
import asyncio
import os
import math
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from contextlib import asynccontextmanager
import time

# Database
from app.db import engine, Base, SessionLocal, get_db
from sqlalchemy.orm import Session
from fastapi import Depends

# Import all models to ensure they are registered with Base
from app.models import User, FireReport, FireIncident, FireStation, SmokeDetection

# Router imports - Database CRUD & Risk Analysis
# Router imports - Database CRUD & Risk Analysis
from app.routes import auth, fire_reports, fire_incidents, fire_stations, smoke_logs, risk

# Import Services
from app.services.weather_service import OpenMeteoService
from app.services.risk_calculator import AdvancedFireRiskCalculator
from app.services.topography_service import TopographyService
from app.services.drought_service import DroughtService

ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

def inverse_distance_weighting(target_point: tuple, data_points: list, power=2) -> float:
    numerator, denominator = 0, 0
    for lon, lat, value in data_points:
        distance = math.sqrt((target_point[0] - lon)**2 + (target_point[1] - lat)**2)
        if distance == 0: return value
        weight = 1.0 / (distance ** power); numerator += weight * value; denominator += weight
    return numerator / denominator if denominator else 0



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables on startup
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    
    app.state.http = httpx.AsyncClient(timeout=10)
    
    # Debug: Print all routes
    print("--- REGISTERED ROUTES ---")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = getattr(route, 'methods', 'N/A')
            print(f"{methods} {route.path}")
    print("------------------------")
    
    yield
    await app.state.http.aclose()

app = FastAPI(
    title="Wildfire Backend API",
    description="Fire detection, risk analysis, and emergency management API",
    version="2.0.0",
    lifespan=lifespan
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Router Registration ---
# Authentication
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Fire Reports (CRUD)
app.include_router(fire_reports.router, prefix="/api/fire-reports", tags=["Fire Reports"])

# Fire Incidents (CRUD)
app.include_router(fire_incidents.router, prefix="/api/fire-incidents", tags=["Fire Incidents"])

# Fire Stations (CRUD)
app.include_router(fire_stations.router, prefix="/api/fire-stations", tags=["Fire Stations"])

# Admin - Smoke Detection Logs
app.include_router(smoke_logs.router, prefix="/api/admin", tags=["Admin - Smoke Logs"])

# Risk Analysis (City-based grid analysis)
app.include_router(risk.router, prefix="/api", tags=["Risk Analysis"])

@app.get("/health")
async def health():
    return {"ok": True, "ts": time.time()}

@app.post("/api/smoke/detect")
async def detect_smoke(
    file: UploadFile = File(...),
    city: str = Query(None),
    district: str = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    db: Session = Depends(get_db)
):
    """
    Smoke detection endpoint using Cloudinary + Roboflow + Database.
    Uses smoke_service.py for full pipeline:
    1. Upload image to Cloudinary
    2. Call Roboflow AI for smoke detection
    3. Save result to smoke_detections table (with Cloudinary URL)
    4. If risk_score > 50%, auto-create fire_report
    """
    try:
        from app.services.smoke_service import detect_smoke_service
        
        result = await detect_smoke_service(
            file=file,
            db=db,
            latitude=latitude,
            longitude=longitude,
            district=district,
            city=city
        )
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Smoke detection failed: {str(e)}")

weather_service = OpenMeteoService()
risk_calculator = AdvancedFireRiskCalculator()
topography_service = TopographyService()
drought_service = DroughtService()

class PolygonRequest(BaseModel): type: str; geometry: Dict[str, Any]; properties: Dict[str, Any]
class RiskPoint(BaseModel): type: str = "Feature"; geometry: Dict[str, Any]; properties: Dict[str, Any]
class RiskResponse(BaseModel): type: str = "FeatureCollection"; features: List[RiskPoint]

@app.post("/risk/nowcast_by_polygon", response_model=RiskResponse)
async def get_risk_nowcast_for_polygon(
    polygon_request: PolygonRequest, hourOffset: int = 0,
    provider: str = "hyper_model_vpd", version: int = 7
):
    polygon = shape(polygon_request.geometry); min_lon, min_lat, max_lon, max_lat = polygon.bounds

    slope_factor_task = topography_service.get_slope_factor((min_lon, min_lat, max_lon, max_lat))
    center_lon, center_lat = polygon.centroid.x, polygon.centroid.y
    main_forecast_task = weather_service.get_forecast(center_lat, center_lon)
    slope_factor, main_forecast = await asyncio.gather(slope_factor_task, main_forecast_task)
    dry_days = drought_service.calculate_consecutive_dry_days(main_forecast) if main_forecast else 0
    drought_factor = drought_service.get_drought_factor(dry_days)

    strategic_points = [(min_lon, min_lat), (max_lon, min_lat), (min_lon, max_lat), (max_lon, max_lat), (center_lon, center_lat)]
    forecast_results = await asyncio.gather(*[weather_service.get_forecast(lat, lon) for lon, lat in strategic_points])
    processed_points = []
    for i, forecast in enumerate(forecast_results):
        if forecast:
            target_weather = weather_service.find_forecast_for_offset(forecast, hourOffset)
            if target_weather:
                features = weather_service.extract_weather_features(target_weather, strategic_points[i][1], strategic_points[i][0])
                processed_points.append({'lon': strategic_points[i][0], 'lat': strategic_points[i][1], 'features': features})
    if not processed_points: return RiskResponse(features=[])
    
    data_sets = {key: [(p['lon'], p['lat'], p['features'][key]) for p in processed_points]
                 for key in ["temperature_c", "relative_humidity", "wind_speed_ms", "wind_direction"]}

    nx, ny = 20, 20
    lon_points = np.linspace(min_lon, max_lon, nx); lat_points = np.linspace(min_lat, max_lat, ny)
    risk_features_to_add = []

    for p_lon in lon_points:
        for p_lat in lat_points:
            if Point(p_lon, p_lat).within(polygon):
                point_features = weather_service.extract_weather_features({}, p_lat, p_lon)
                for key, data in data_sets.items():
                    point_features[key] = inverse_distance_weighting((p_lon, p_lat), data)
                
                risk_value = risk_calculator.calculate_risk(point_features, slope_factor, drought_factor)
                
                risk_features_to_add.append(RiskPoint(
                    geometry={"type": "Point", "coordinates": [p_lon, p_lat]},
                    properties={
                        "risk": round(risk_value, 2), "temp": round(point_features['temperature_c'], 1),
                        "rh": int(point_features['relative_humidity']), "wind": round(point_features['wind_speed_ms'], 1),
                        "wind_dir": int(point_features.get('wind_direction', 0)),
                        "fuel_moisture": round(point_features.get('fuel_moisture', 0.5), 2),
                        "vegetation": point_features.get('vegetation_type', 'unknown'),
                        "slope_factor": round(slope_factor, 2), "drought_factor": round(drought_factor, 2),
                        "dry_days": dry_days, "provider": f"{provider}:v{version}"
                    }
                ))

    print(f"Risk calculated for '{polygon_request.properties.get('name')}' (VPD Model). Drought Factor: {drought_factor:.2f}, Slope Factor: {slope_factor:.2f}")
    return RiskResponse(features=risk_features_to_add)