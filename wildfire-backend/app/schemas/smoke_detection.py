from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class SmokeDetectionCreate(BaseModel):
    image_url: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    district: Optional[str] = None
    risk_score: Optional[Decimal] = None
    status: Optional[str] = "pending"

class SmokeDetectionResponse(BaseModel):
    id: UUID
    image_url: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    district: Optional[str] = None
    risk_score: Optional[Decimal] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
