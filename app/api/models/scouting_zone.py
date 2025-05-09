from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from app.services.db import Base


class ScoutingZone(Base):
    __tablename__ = "scouting_zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_code = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)
    max_units = Column(Numeric, nullable=True)
    max_lot_coverage = Column(Numeric, nullable=True)
    max_far = Column(Numeric, nullable=True)
    maximum_building_height = Column(Numeric, nullable=True)
    maximum_stories = Column(Integer, nullable=True)
    setback_distance = Column(Numeric, nullable=True)
    minimum_parking = Column(Numeric, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_response(self):
        return ScoutingZoneResponse(
            id=self.id,
            zone_code=self.zone_code,
            city=self.city,
            province=self.province,
            max_units=self.max_units,
            max_lot_coverage=self.max_lot_coverage,
            max_far=self.max_far,
            maximum_building_height=self.maximum_building_height,
            maximum_stories=self.maximum_stories,
            setback_distance=self.setback_distance,
            minimum_parking=self.minimum_parking,
            created_at=self.created_at
        )


