# wildfire-backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx

# Database
from app.db import engine, Base

# Import all models to ensure they are registered with Base
from app.models import User, FireReport, FireIncident, FireStation, SmokeDetection

# Router imports - EXISTING (Preserved Custom Logic)
from app.routes import health, smoke, risk, stations, incidents

# Router imports - NEW (Database CRUD)
from app.routes import auth, fire_reports, fire_incidents, fire_stations, smoke_logs

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
            print(f"Path: {route.path} | Name: {route.name}")
    print("------------------------")
    
    yield
    await app.state.http.aclose()

app = FastAPI(
    title="Wildfire Backend API",
    description="Fire detection, risk analysis, and emergency management API",
    version="2.0.0",
    lifespan=lifespan
)

# --- CORS Settings ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Wiring ---
def include_routers(app: FastAPI):
    # Health Check
    app.include_router(health.router, tags=["Health"])
    
    # ====== PRESERVED CUSTOM LOGIC ======
    # Smoke Detection (Roboflow AI - Local Custom Logic)
    app.include_router(smoke.router, prefix="/api/smoke", tags=["Smoke Detection"])
    
    # Risk Analysis (Heuristic Algorithm - Local Custom Logic)
    app.include_router(risk.router, prefix="/api", tags=["Risk Analysis"])
    
    # Dashboard Data (Mock endpoints for legacy support)
    app.include_router(stations.router, tags=["Dashboard"])
    app.include_router(incidents.router, tags=["Dashboard"])
    
    # ====== NEW DATABASE ROUTES ======
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

include_routers(app)

@app.get("/")
def read_root():
    return {"message": "Wildfire Backend API v2.0 🚀", "status": "operational", "database": "Neon PostgreSQL"}