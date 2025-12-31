from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.deps import get_db
from app.services.smoke_service import detect_smoke_service

router = APIRouter()

@router.post("/detect")
async def detect_smoke(
    file: UploadFile = File(...),
    latitude: Optional[float] = Query(None, description="Location latitude"),
    longitude: Optional[float] = Query(None, description="Location longitude"),
    district: Optional[str] = Query(None, description="District/Region name"),
    city: Optional[str] = Query(None, description="City name"),
    db: Session = Depends(get_db)
):
    """
    Smoke Detection Endpoint with Automatic Flow:
    - Analyzes uploaded image for smoke using Roboflow AI
    - Saves detection to smoke_detections table (with city/district)
    - Auto-creates fire_report if risk > 50%
    - Returns detection_id and report_id
    """
    try:
        return await detect_smoke_service(
            file=file,
            db=db,
            latitude=latitude,
            longitude=longitude,
            district=district,
            city=city
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smoke detection failed: {str(e)}")
