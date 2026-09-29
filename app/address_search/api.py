"""Address candidates only; no parcel join or automatic selection."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.address_search.models import SearchRequest, SearchResponse
from app.address_search.provider import GeocoderClient

router = APIRouter(prefix="/api/address-search", tags=["address-search"])


def get_client() -> GeocoderClient:
    return GeocoderClient()


@router.post("", response_model=SearchResponse)
def search_address(
    request: SearchRequest, client: Annotated[GeocoderClient, Depends(get_client)]
) -> SearchResponse:
    return client.search(request)
