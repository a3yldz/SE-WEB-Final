from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import uuid

class FireStation(Base):
    __tablename__ = "fire_stations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="available")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    fire_incidents = relationship("FireIncident", back_populates="fire_station")