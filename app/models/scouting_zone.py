from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, Integer, String, Numeric, DateTime, func
from app.services.db import Base


class ScoutingZone(Base):
    __tablename__ = "scouting_zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_code = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)

    max_units = Column(Numeric, nullable=True)
    max_lot_coverage = Column(Numeric, nullable=True)
    max_lot_coverage_is_ratio = Column(Boolean, nullable=False, default=False)
    max_far = Column(Numeric, nullable=True)
    maximum_building_height = Column(Numeric, nullable=True)
    maximum_stories = Column(Integer, nullable=True)
    setback_distance = Column(Numeric, nullable=True)
    setback_is_ratio = Column(Boolean, nullable=False, default=False)

    minimum_parking = Column(Numeric, nullable=True)
    parking_is_ratio = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

