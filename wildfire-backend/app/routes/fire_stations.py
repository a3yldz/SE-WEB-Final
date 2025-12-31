from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
from app.deps import get_db
from app.utils.dependencies import get_current_admin
from app.models.fire_station import FireStation
import uuid

router = APIRouter()

class FireStationCreate(BaseModel):
    name: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "available"

class FireStationUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None

class FireStationResponse(BaseModel):
    id: str
    name: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)
    
    class Config:
        from_attributes = True

@router.post("", response_model=FireStationResponse)
def create_fire_station(data: FireStationCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Create a new fire station."""
    station = FireStation(id=str(uuid.uuid4()), **data.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return station

@router.get("", response_model=List[FireStationResponse])
def get_fire_stations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all fire stations."""
    return db.query(FireStation).offset(skip).limit(limit).all()

@router.get("/{station_id}", response_model=FireStationResponse)
def get_fire_station(station_id: str, db: Session = Depends(get_db)):
    """Get a single fire station by ID."""
    station = db.query(FireStation).filter(FireStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")
    return station

@router.put("/{station_id}", response_model=FireStationResponse)
def update_fire_station(station_id: str, data: FireStationUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Update a fire station."""
    station = db.query(FireStation).filter(FireStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)
    
    db.commit()
    db.refresh(station)
    return station

@router.delete("/{station_id}")
def delete_fire_station(station_id: str, db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """Delete a fire station."""
    station = db.query(FireStation).filter(FireStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")
    
    db.delete(station)
    db.commit()
    return {"message": "Fire station deleted successfully"}