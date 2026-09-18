from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any, Dict, List, Optional

class ScoutingZoneResponse(BaseModel):
    id: int
    zone_code: str
    city: str
    province: str

    max_units: Optional[float]
    max_lot_coverage: Optional[float]
    max_far: Optional[float]
    maximum_building_height: Optional[float]
    maximum_stories: Optional[int]
    setback_distance: Optional[float]
    minimum_parking: Optional[float]

    created_at: datetime
    
class ZoningUploadRequest(BaseModel):
    city: str = Field(..., description="City the zone belongs to")
    zone_code: str = Field(..., description="Zone name or code, e.g., RT-1")
    part_1_zoning_parameters: Dict[str, Any]