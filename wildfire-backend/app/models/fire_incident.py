from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import uuid

class FireIncident(Base):
    __tablename__ = "fire_incidents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    address = Column(String, nullable=True)
    district = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="active")
    reported_by = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_station_id = Column(String, ForeignKey("fire_stations.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    fire_station = relationship("FireStation", back_populates="fire_incidents")
    user = relationship("User", back_populates="fire_incidents")