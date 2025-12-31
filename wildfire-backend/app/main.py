from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import os

from app.db import engine, Base

from app.models import User, FireReport, FireIncident, FireStation, SmokeDetection

from app.routes import health, smoke, risk, stations, incidents

from app.routes import auth, fire_reports, fire_incidents, fire_stations, smoke_logs

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    
    app.state.http = httpx.AsyncClient(timeout=10)
    
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
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "*",FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def include_routers(app: FastAPI):
    app.include_router(health.router, tags=["Health"])
    
    app.include_router(smoke.router, prefix="/api/smoke", tags=["Smoke Detection"])
    
    app.include_router(risk.router, prefix="/api", tags=["Risk Analysis"])
    
    app.include_router(stations.router, tags=["Dashboard"])
    app.include_router(incidents.router, tags=["Dashboard"])
    
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    
    app.include_router(fire_reports.router, prefix="/api/fire-reports", tags=["Fire Reports"])
    
    app.include_router(fire_incidents.router, prefix="/api/fire-incidents", tags=["Fire Incidents"])
    
    app.include_router(fire_stations.router, prefix="/api/fire-stations", tags=["Fire Stations"])
    
    app.include_router(smoke_logs.router, prefix="/api/admin", tags=["Admin - Smoke Logs"])

include_routers(app)

@app.get("/")
def read_root():
    return {"message": "Wildfire Backend API v2.0 🚀", "status": "operational", "database": "Neon PostgreSQL"}