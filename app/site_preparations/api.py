"""Read-only lookup against the exact configured spatial revision."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from app.investigation import investigation

from .address_packet import AddressPacketError
from .service import Lookup, lookup

router = APIRouter(prefix="/api/site-preparations", tags=["Unreviewed site preparation"])


@router.get("/lookup", response_model=Lookup)
def site_lookup(
    kind: Literal["pid", "address"],
    q: str = Query(min_length=1, max_length=200),
) -> Lookup:
    try:
        return lookup(investigation(), kind, q)
    except AddressPacketError:
        raise HTTPException(502, "Retained address evidence is invalid") from None
    except ValueError:
        raise HTTPException(400, "Invalid site lookup query or retained observations") from None
