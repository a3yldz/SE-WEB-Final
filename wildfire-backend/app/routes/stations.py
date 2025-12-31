from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter()

class FireStation(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    status: str
    personnel: int
    vehicles: int

STATIONS = [
    {"id": "1", "name": "Kadikoy Central Station", "lat": 40.9833, "lng": 29.0277, "status": "Active", "personnel": 24, "vehicles": 5},
    {"id": "2", "name": "Uskudar Response Unit", "lat": 41.0260, "lng": 29.0160, "status": "Available", "personnel": 18, "vehicles": 3},
    {"id": "3", "name": "Besiktas Emergency Team", "lat": 41.0428, "lng": 29.0075, "status": "Maintenance", "personnel": 12, "vehicles": 2},
]

@router.get("/stations", response_model=List[FireStation])
async def get_stations():
    return STATIONS
