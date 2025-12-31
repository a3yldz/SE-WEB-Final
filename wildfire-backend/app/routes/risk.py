from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import math
import uuid

from app.deps import get_db
from app.models.fire_incident import FireIncident

router = APIRouter()

# Expanded Bounding Boxes (Wider coverage for Izmir)
CITY_BOUNDS = {
    "izmir": {
        "min_lat": 38.2500, "max_lat": 38.6500, 
        "min_lon": 26.8500, "max_lon": 27.4500
    },
    "istanbul": {"min_lat": 40.85, "max_lat": 41.15, "min_lon": 28.60, "max_lon": 29.25},
    "ankara":  {"min_lat": 39.80, "max_lat": 40.05, "min_lon": 32.70, "max_lon": 33.00}
}

def calculate_heuristic_risk(temp, humidity, wind, vegetation_index):
    """
    Weighted Heuristic Calculation:
    Risk = (Temp * 0.35) + (Low Humidity * 0.35) + (Wind * 0.20) + (Vegetation * 0.10)
    """
    # Normalize inputs to 0-100 scale
    temp_score = min(max((temp - 20) / 20, 0), 1) * 100
    hum_score = (100 - humidity) 
    wind_score = min(wind / 50, 1) * 100
    
    total_risk = (temp_score * 0.35) + (hum_score * 0.35) + (wind_score * 0.20) + (vegetation_index * 0.10)
    return min(total_risk, 100)

from app.services.weather_service import OpenMeteoService

# Instantiate service locally or inject
weather_service = OpenMeteoService()

def generate_risk_grid(city_key: str, real_weather: dict = None):
    points = []
    id_counter = 1
    bbox = CITY_BOUNDS.get(city_key, CITY_BOUNDS["izmir"])
    
    # Step size (approx 1.5km grid)
    step = 0.015 

    lat = bbox["min_lat"]
    while lat < bbox["max_lat"]:
        lon = bbox["min_lon"]
        while lon < bbox["max_lon"]:
            
            # --- Simulation Logic ---
            # Calculate distance from city center (Konak) to simulate vegetation density
            # Further from center = More vegetation = Higher base risk
            dist_to_center = math.sqrt((lat - 38.42)**2 + (lon - 27.14)**2)
            vegetation_index = min(dist_to_center * 200, 100)
            
            # Use Real Environmental Data if available, otherwise fallback to safe winter defaults
            if real_weather:
                # Add slight random variation to make the grid look natural, not flat
                simulated_temp = real_weather['temperature_c'] + random.uniform(-0.5, 0.5)
                simulated_hum = real_weather['relative_humidity'] + random.uniform(-2, 2)
                simulated_wind = real_weather['wind_speed_ms'] * 3.6 + random.uniform(-2, 2) # Convert m/s back to km/h for this specific heuristic formula if needed, OR adjust formula. 
                # The heuristic `calculate_heuristic_risk` expects wind in some unit. 
                # Line 31: `wind / 50`. If wind is 5 m/s, score is 10. If 40 km/h, score is 80.
                # It likely expects km/h given the divisor 50. OpenMeteoService returns m/s.
                # So we multiply by 3.6.
            else:
                simulated_temp = random.uniform(5, 15)    
                simulated_hum = random.uniform(40, 80)     
                simulated_wind = random.uniform(5, 20)     
            
            # Calculate Score
            risk_score = calculate_heuristic_risk(simulated_temp, simulated_hum, simulated_wind, vegetation_index)
            
            # Determine Level
            if risk_score > 75: level = "High"
            elif risk_score > 45: level = "Medium"
            else: level = "Low"

            points.append({
                "id": id_counter,
                "lat": round(lat, 4),
                "lng": round(lon, 4),
                "riskLevel": level,
                "district": f"Sector-{id_counter}",
                "temp": round(simulated_temp, 1),
                "humidity": int(simulated_hum),
                "wind": round(simulated_wind, 1),
                "vegetation": int(vegetation_index),
                "score": int(risk_score)
            })
            
            id_counter += 1
            lon += step
        lat += step
        
    return points

def check_recent_incident(db: Session, district: str) -> bool:
    """
    Check if an active incident already exists in the district within the last 1 hour.
    Returns True if duplicate exists, False otherwise.
    """
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    existing = db.query(FireIncident).filter(
        FireIncident.district == district,
        FireIncident.status == "active",
        FireIncident.created_at >= one_hour_ago
    ).first()
    return existing is not None

@router.get("/risk-analysis")
async def get_risk_analysis(city: str = "izmir", db: Session = Depends(get_db)):
    """
    Risk Analysis Endpoint with Automatic Fire Incident Creation.
    
    - Fetches REAL weather data for the city center.
    - Generates risk grid using heuristic calculation.
    - For ALL points with risk > 70%, auto-creates fire_incident (with duplicate prevention)
    - Returns incidents_created count and incident_ids in response
    """
    # 1. Fetch Real Weather for City Center
    bbox = CITY_BOUNDS.get(city.lower(), CITY_BOUNDS["izmir"])
    center_lat = (bbox["min_lat"] + bbox["max_lat"]) / 2
    center_lon = (bbox["min_lon"] + bbox["max_lon"]) / 2
    
    weather_data_raw = await weather_service.get_forecast(center_lat, center_lon)
    real_weather = None
    if weather_data_raw:
        # Extract features usually handles mapping, use it to get clean dict
        real_weather = weather_service.extract_weather_features(weather_data_raw, center_lat, center_lon)
        
    points = generate_risk_grid(city.lower(), real_weather)
    
    # Find ALL high-risk points (score > 70)
    high_risk_points = [p for p in points if p["score"] > 70]
    
    incidents_created = 0
    incident_ids = []
    
    # Auto-create fire incidents for ALL high-risk points
    # Wrapped in try-catch to prevent API crash if DB schema mismatch
    try:
        for risk_point in high_risk_points:
            district_name = f"{city.capitalize()} - {risk_point['district']}"
            
            # Duplicate prevention: Check if an active incident exists in last hour for THIS sector
            if not check_recent_incident(db, district_name):
                incident_id = uuid.uuid4()  # Native UUID object for PostgreSQL UUID column
                new_incident = FireIncident(
                    id=incident_id,
                    district=district_name,
                    address="Auto-detected via Risk Analysis",
                    latitude=risk_point["lat"],
                    longitude=risk_point["lng"],
                    status="active",
                    reported_by=None,
                    assigned_station_id=None
                )
                db.add(new_incident)
                incidents_created += 1
                incident_ids.append(str(incident_id))
        
        # Commit all at once for efficiency
        if incidents_created > 0:
            db.commit()
    except Exception as e:
        # Log error but don't crash - just skip incident creation
        print(f"[Risk Analysis] Incident auto-creation skipped due to: {e}")
        db.rollback()
        incidents_created = 0
        incident_ids = []
    
    # Find max risk for response
    max_risk = max(p["score"] for p in points) if points else 0
    
    return {
        "city": city,
        "points": points,
        "max_risk": max_risk,
        "high_risk_count": len(high_risk_points),
        "incidents_created": incidents_created,
        "incident_ids": incident_ids
    }