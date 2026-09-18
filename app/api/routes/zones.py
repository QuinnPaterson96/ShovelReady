from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.scouting_zone import ZoningUploadRequest
from app.services.db import get_db
from app.models.scouting_zone import ScoutingZone
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/zones", tags=["Zones"])




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

def is_ratio(item: Any) -> bool:
    if isinstance(item, dict):
        return item.get("isRatioOf", "").lower() not in ("n/a", "", None)
    return False



def extract_validated_field(
    field_obj: Any,
    field_name: str,
    expected_is_ratio: Optional[bool] = None,
    expected_extremum: Optional[str] = None  # "min", "max", or None
) -> tuple[Optional[float], bool]:
    """
    Returns (value, is_ratio). Raises if structure is invalid or expectation fails.
    """
    if field_obj is None:
        return None, False

    # Handle list of conditionals
    if isinstance(field_obj, list):
        candidates = [
            (sub.get("value_if_condition") or sub.get("value_if_threshold"))
            for sub in field_obj if sub
        ]
        field_obj = max(candidates, key=lambda x: x.get("value", float("-inf")))

    if not isinstance(field_obj, dict):
        raise ValueError(f"{field_name} must be a dictionary or list of conditionals")

    # Validate value
    value = field_obj.get("value")
    if not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must have a numeric 'value'")

    # There are some fields that we expect to be ratios, or not ratios or that can be either 
    # Ex a setback may be a ratio or a distance, but a FAR we expect to be a ratio and a max height we expect to be a distance
    # Because later logic may depend on this, we need to validate that these fields make sense
    is_ratio = is_ratio(field_obj)
    if expected_is_ratio is not None and is_ratio != expected_is_ratio:
        raise ValueError(
            f"{field_name}: expected is_ratio={expected_is_ratio} but got {is_ratio}"
        )

    # Validate min/max constraint, similarly in this case we have certain expectations that may not be true across all cities, or alternately whos failure may indicate
    # that the data is not being parsed correctly so we want to validate that here
    if expected_extremum == "min" and not field_obj.get("is_minimum", False):
        raise ValueError(f"{field_name} is expected to be a minimum constraint")
    if expected_extremum == "max" and not field_obj.get("is_maximum", False):
        raise ValueError(f"{field_name} is expected to be a maximum constraint")

    return value, is_ratio


@router.post("/upload")
def inject_formatted_zoning_data(
    request: ZoningUploadRequest,
    db: Session = Depends(get_db)
):
    try:
        zone_data = request.part_1_zoning_parameters

        max_units, _ = extract_validated_field(
            zone_data.get("unit_density_per_lot"),
            field_name="unit_density_per_lot",
            expected_is_ratio=False,
            expected_extremum="max"
        )

        max_lot_coverage, lot_coverage_is_ratio = extract_validated_field(
            zone_data.get("lot_coverage"),
            field_name="lot_coverage",
            expected_extremum="max"
        )

        max_far, _ = extract_validated_field(
            zone_data.get("FAR/FSI"),
            field_name="FAR/FSI",
            expected_extremum="max",
            expected_is_ratio=True
        )

        max_building_height, _ = extract_validated_field(
            zone_data.get("maximum_building_height"),
            field_name="maximum_building_height",
            expected_extremum="max",
            expected_is_ratio=False
        )

        max_stories, _ = extract_validated_field(
            zone_data.get("maximum_stories"),
            field_name="maximum_stories",
            expected_extremum="max",
            expected_is_ratio=False
        )

        setback_distance, setback_is_ratio = extract_validated_field(
            zone_data.get("setback_distances", {}).get("front_yard"),
            field_name="front_yard",
            expected_extremum="min"
        )

        minimum_parking, parking_is_ratio = extract_validated_field(
            zone_data.get("parking_requirements"),
            field_name="parking_requirements",
            expected_extremum="min"
        )

        scouting_entry = ScoutingZone(
            zone_code=request.zone_code,
            city=request.city,
            province="BC",
            max_units=max_units,
            max_lot_coverage=max_lot_coverage,
            lot_coverage_is_ratio=lot_coverage_is_ratio,
            max_far=max_far,
            maximum_building_height=max_building_height,
            maximum_stories=max_stories,
            setback_distance=setback_distance,
            setback_is_ratio=setback_is_ratio,
            minimum_parking=minimum_parking,
            parking_is_ratio=parking_is_ratio,
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