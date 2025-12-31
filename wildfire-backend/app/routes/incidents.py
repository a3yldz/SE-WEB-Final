from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter()

class Incident(BaseModel):
    id: str
    type: str
    location: str
    lat: float
    lng: float
    status: str
    risk_level: str
    timestamp: str

# Mock data
INCIDENTS = [
    {"id": "INC-001", "type": "Fire", "location": "Aydos Forest, Istanbul", "lat": 40.9500, "lng": 29.2500, "status": "Active", "risk_level": "High", "timestamp": "2024-10-12T14:30:00Z"},
    {"id": "INC-002", "type": "Smoke", "location": "Belgrad Forest, Istanbul", "lat": 41.1700, "lng": 28.9500, "status": "Investigating", "risk_level": "Medium", "timestamp": "2024-10-12T15:45:00Z"},
]

@router.get("/incidents", response_model=List[Incident])
async def get_incidents():
    return INCIDENTS

@router.get("/dashboard-stats")
async def get_dashboard_stats():
    return {
        "active_incidents": 3,
        "available_units": 14,
        "avg_response_time": 4.2,
        "risk_coverage": 98.5
    }
