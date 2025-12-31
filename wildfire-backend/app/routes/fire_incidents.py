from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
from app.deps import get_db
from app.utils.dependencies import get_current_admin
from app.models.fire_incident import FireIncident
import uuid

router = APIRouter()

class FireIncidentCreate(BaseModel):
    district: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "active"

class FireIncidentUpdate(BaseModel):
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    assigned_station_id: Optional[str] = None

class FireIncidentResponse(BaseModel):
    id: str
    district: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    reported_by: Optional[str] = None
    assigned_station_id: Optional[str] = None
    created_at: Optional[datetime] = None
    
    @field_validator('id', 'reported_by', 'assigned_station_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)
    
    class Config:
        from_attributes = True

@router.post("", response_model=FireIncidentResponse)
def create_fire_incident(data: FireIncidentCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Create a new fire incident."""
    incident = FireIncident(id=str(uuid.uuid4()), **data.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident

@router.get("")
def get_fire_incidents(
    skip: int = 0, 
    limit: int = 500, 
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get fire incidents with optional city filter and pagination.
    
    - city: Filter by city name (partial match on district field)
    - skip/limit: Pagination controls
    
    Returns: {items: [], total: int, skip: int, limit: int}
    """
    query = db.query(FireIncident)
    
    if city:
        query = query.filter(FireIncident.district.ilike(f"%{city}%"))
    
    total = query.count()
    
    incidents = query.order_by(FireIncident.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": incidents,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{incident_id}", response_model=FireIncidentResponse)
def get_fire_incident(incident_id: str, db: Session = Depends(get_db)):
    """Get a single fire incident by ID."""
    incident = db.query(FireIncident).filter(FireIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    return incident

@router.put("/{incident_id}", response_model=FireIncidentResponse)
def update_fire_incident(incident_id: str, data: FireIncidentUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Update a fire incident."""
    incident = db.query(FireIncident).filter(FireIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)
    
    db.commit()
    db.refresh(incident)
    return incident

@router.delete("/{incident_id}")
def delete_fire_incident(incident_id: str, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Delete a fire incident."""
    incident = db.query(FireIncident).filter(FireIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    
    db.delete(incident)
    db.commit()
    return {"message": "Fire incident deleted successfully"}

from app.models.fire_station import FireStation
import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth (in km)."""
    R = 6371
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


@router.post("/{incident_id}/dispatch")
def dispatch_to_nearest_station(
    incident_id: str, 
    db: Session = Depends(get_db), 
    current_user: Any = Depends(get_current_admin)
):
    """
    Smart Dispatch: Find nearest available station and assign to incident.
    
    1. Get incident by ID
    2. Find all available stations
    3. Sort by distance (Haversine formula)
    4. Assign nearest station to incident
    5. Update station status to 'dispatched'
    """
    incident = db.query(FireIncident).filter(FireIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    
    if incident.assigned_station_id:
        raise HTTPException(status_code=400, detail="Incident already has an assigned station")
    
    available_stations = db.query(FireStation).filter(FireStation.status == "available").all()
    
    if not available_stations:
        raise HTTPException(status_code=404, detail="No available fire stations")
    
    incident_lat = incident.latitude or 39.0  
    incident_lon = incident.longitude or 35.0
    
    nearest_station = None
    min_distance = float('inf')
    
    for station in available_stations:
        station_lat = station.latitude or 39.0
        station_lon = station.longitude or 35.0
        
        distance = haversine_distance(incident_lat, incident_lon, station_lat, station_lon)
        
        if distance < min_distance:
            min_distance = distance
            nearest_station = station
    
    if not nearest_station:
        raise HTTPException(status_code=404, detail="Could not find a suitable station")
    
    incident.assigned_station_id = nearest_station.id
    nearest_station.status = "dispatched"
    
    db.commit()
    db.refresh(incident)
    db.refresh(nearest_station)
    
    return {
        "message": "Station dispatched successfully",
        "incident_id": str(incident.id),
        "station_id": str(nearest_station.id),
        "station_name": nearest_station.name,
        "distance_km": round(min_distance, 2)
    }