from typing import Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.services.db import get_db
from app.models.scouting_zone import ScoutingZone
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/zones", tags=["Zones"])


# Request model



# Helper to extract max numeric value
def extract_numeric_value(item: Any) -> float | None:
    if isinstance(item, dict):
        return item.get("value")
    if isinstance(item, list):
        try:
            return max(
                extract_numeric_value(x.get("value_if_condition") or x.get("value_if_threshold"))
                for x in item if x
            )
        except Exception:
            return None
    return None


@router.post("/upload")
def inject_formatted_zoning_data(
    request: ZoningUploadRequest,
    db: Session = Depends(get_db)
):
    try:
        zone_data = request.part_1_zoning_parameters

        scouting_entry = ScoutingZone(
            zone_code=request.zone_code,
            city=request.city,
            province="BC",  # Static for demo
            max_units=extract_numeric_value(zone_data.get("unit_density_per_lot")),
            max_lot_coverage=extract_numeric_value(zone_data.get("lot_coverage")),
            max_far=extract_numeric_value(zone_data.get("FAR/FSI")),
            maximum_building_height=extract_numeric_value(zone_data.get("maximum_building_height")),
            maximum_stories=extract_numeric_value(zone_data.get("maximum_stories")),
            setback_distance=extract_numeric_value(zone_data.get("setback_distances", {}).get("front_yard")),
            minimum_parking=extract_numeric_value(zone_data.get("parking_requirements")),
        )

        db.add(scouting_entry)
        db.commit()
        db.refresh(scouting_entry)

        return {"status": "success", "zone_id": scouting_entry.id}

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")
