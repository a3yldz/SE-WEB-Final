from sqlalchemy import Column, String, Float, DateTime
from app.db import Base
from datetime import datetime, timezone
import uuid

class SmokeDetection(Base):
    __tablename__ = "smoke_detections"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    image_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    district = Column(String, nullable=True)
    risk_score = Column(Float, nullable=True)
    status = Column(String, default="detected")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))