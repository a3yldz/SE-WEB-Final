from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.deps import get_db
from app.models.fire_report import FireReport

router = APIRouter()

# Schemas
class FireReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    user_id: Optional[str] = None

class FireReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

class FireReportResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    location: Optional[str]
    image_url: Optional[str]
    status: str
    user_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("", response_model=FireReportResponse)
def create_fire_report(data: FireReportCreate, db: Session = Depends(get_db)):
    """Create a new fire report."""
    report = FireReport(**data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("", response_model=List[FireReportResponse])
def get_fire_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all fire reports."""
    return db.query(FireReport).offset(skip).limit(limit).all()

@router.get("/{report_id}", response_model=FireReportResponse)
def get_fire_report(report_id: int, db: Session = Depends(get_db)):
    """Get a single fire report by ID."""
    report = db.query(FireReport).filter(FireReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Fire report not found")
    return report

@router.put("/{report_id}", response_model=FireReportResponse)
def update_fire_report(report_id: int, data: FireReportUpdate, db: Session = Depends(get_db)):
    """Update a fire report."""
    report = db.query(FireReport).filter(FireReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Fire report not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    return report

@router.delete("/{report_id}")
def delete_fire_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a fire report."""
    report = db.query(FireReport).filter(FireReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Fire report not found")
    
    db.delete(report)
    db.commit()
    return {"message": "Fire report deleted successfully"}