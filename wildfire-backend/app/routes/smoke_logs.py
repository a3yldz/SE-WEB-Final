from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
from app.deps import get_db
from app.utils.dependencies import get_current_admin
from app.models.smoke_detection import SmokeDetection

router = APIRouter()

# Response Schema
class SmokeDetectionResponse(BaseModel):
    id: str
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    risk_score: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)
    
    @field_validator('risk_score', mode='before')
    @classmethod
    def convert_decimal_to_float(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        return float(v)
    
    class Config:
        from_attributes = True

@router.get("/smoke-detections", response_model=List[SmokeDetectionResponse])
def get_smoke_detections(
    min_risk: Optional[float] = Query(None, description="Minimum risk score filter (0-100 scale)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_admin)
):
    """
    Admin Endpoint: Get all smoke detections from database.
    
    - Supports min_risk filter (e.g., ?min_risk=70 for high-risk only)
    - Sorted by created_at (newest first)
    - Paginated with skip/limit
    """
    query = db.query(SmokeDetection)
    
    # Filter by minimum risk score (convert to 0-1 scale for DB)
    if min_risk is not None:
        min_risk_db = min_risk / 100.0  # Convert 70% -> 0.7
        query = query.filter(SmokeDetection.risk_score >= min_risk_db)
    
    # Order by newest first
    query = query.order_by(desc(SmokeDetection.created_at))
    
    # Apply pagination
    detections = query.offset(skip).limit(limit).all()
    
    # Convert risk_score back to 0-100 scale for response
    result = []
    for d in detections:
        result.append({
            "id": str(d.id),
            "image_url": d.image_url,
            "latitude": float(d.latitude) if d.latitude else None,
            "longitude": float(d.longitude) if d.longitude else None,
            "district": d.district,
            "risk_score": float(d.risk_score) * 100 if d.risk_score else None,  # Convert to %
            "status": d.status,
            "created_at": d.created_at
        })
    
    return result

@router.get("/smoke-detections/stats")
def get_smoke_detection_stats(db: Session = Depends(get_db), current_user: Any = Depends(get_current_admin)):
    """
    Admin Endpoint: Get smoke detection statistics.
    """
    total = db.query(SmokeDetection).count()
    high_risk = db.query(SmokeDetection).filter(SmokeDetection.risk_score >= 0.7).count()
    medium_risk = db.query(SmokeDetection).filter(
        SmokeDetection.risk_score >= 0.4,
        SmokeDetection.risk_score < 0.7
    ).count()
    low_risk = db.query(SmokeDetection).filter(SmokeDetection.risk_score < 0.4).count()
    
    return {
        "total": total,
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk
    }


# --- Approve & Create Incident Endpoint ---
from app.models.fire_incident import FireIncident
from app.models.fire_station import FireStation
import uuid
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


@router.post("/smoke-detections/{detection_id}/approve")
def approve_smoke_detection(
    detection_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_admin)
):
    """
    Approve a smoke detection and create a fire incident.
    
    1. Get smoke detection by ID
    2. Create new FireIncident from detection data
    3. Find nearest available station
    4. Assign station to incident
    5. Update detection status to 'confirmed'
    """
    # Get detection
    detection = db.query(SmokeDetection).filter(SmokeDetection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Smoke detection not found")
    
    if detection.status == "confirmed":
        raise HTTPException(status_code=400, detail="Detection already confirmed")
    
    # Create new fire incident from detection
    # Note: reported_by uses current_user.id (the approving admin), not detection.id
    incident = FireIncident(
        id=str(uuid.uuid4()),
        district=detection.district or "Unknown",
        address=f"AI-Detected Smoke - Risk: {(detection.risk_score or 0) * 100:.1f}%",
        latitude=float(detection.latitude) if detection.latitude else None,
        longitude=float(detection.longitude) if detection.longitude else None,
        status="active",
        reported_by=str(current_user.id) if current_user else None  # Admin who approved
    )
    db.add(incident)
    
    # Find nearest available station
    available_stations = db.query(FireStation).filter(FireStation.status == "available").all()
    
    nearest_station = None
    min_distance = float('inf')
    
    if available_stations and incident.latitude and incident.longitude:
        for station in available_stations:
            if station.latitude and station.longitude:
                distance = haversine_distance(
                    incident.latitude, incident.longitude,
                    station.latitude, station.longitude
                )
                if distance < min_distance:
                    min_distance = distance
                    nearest_station = station
    
    # Assign station if found
    if nearest_station:
        incident.assigned_station_id = nearest_station.id
        nearest_station.status = "dispatched"
    
    # Update detection status
    detection.status = "confirmed"
    
    db.commit()
    db.refresh(incident)
    
    return {
        "message": "Detection approved and incident created",
        "incident_id": str(incident.id),
        "district": incident.district,
        "station_assigned": nearest_station.name if nearest_station else None,
        "distance_km": round(min_distance, 2) if nearest_station else None
    }


@router.post("/smoke-detections/{detection_id}/decline")
def decline_smoke_detection(
    detection_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_admin)
):
    """
    Decline/Ignore a smoke detection (mark as false alarm).
    Sets status to 'ignored' so it's removed from pending list.
    """
    detection = db.query(SmokeDetection).filter(SmokeDetection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Smoke detection not found")
    
    if detection.status in ["confirmed", "ignored"]:
        raise HTTPException(status_code=400, detail=f"Detection already {detection.status}")
    
    detection.status = "ignored"
    db.commit()
    
    return {
        "message": "Detection marked as false alarm",
        "detection_id": str(detection.id),
        "status": "ignored"
    }

