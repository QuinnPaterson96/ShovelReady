"""Public v1 address-search boundary. Provider scores do not describe parcel confidence."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

VERSION = "sr-address-search.v1"


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: Literal["sr-address-search.v1"]
    query: str = Field(min_length=3, max_length=160)
    maxResults: int = Field(default=5, ge=1, le=5, strict=True)

    @field_validator("query")
    @classmethod
    def meaningful_query(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3 or any(ord(character) < 32 for character in value):
            raise ValueError("query must contain at least three printable characters")
        return value


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crs: Literal["EPSG:4326"] = "EPSG:4326"
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False, strict=True)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False, strict=True)


class AddressParts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    siteName: str
    unitDesignator: str
    unitNumber: str
    unitNumberSuffix: str
    civicNumber: str
    civicNumberSuffix: str
    streetName: str
    streetType: str
    streetDirection: str
    streetQualifier: str
    streetAddress: str
    localityName: str
    localityType: str
    electoralArea: str
    provinceCode: str


class Fault(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str
    element: str
    fault: str
    penalty: float = Field(allow_inf_nan=False, strict=True)


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locator: str
    fullAddress: str
    address: AddressParts
    locality: str
    providerSiteId: str | None
    score: float = Field(ge=0, le=100, allow_inf_nan=False, strict=True)
    matchPrecision: str
    faults: list[Fault]
    locationDescriptor: str
    locationPositionalAccuracy: str
    point: Point
    sourceChangeDate: str | None


class SourceCapture(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Literal["BC Address Geocoder"] = "BC Address Geocoder"
    sourceUrl: str
    fetchedAt: datetime
    providerSearchTimestamp: str | None
    providerBaseDataDate: str | None
    providerVersion: str | None
    responseSha256: str
    licence: Literal["Open Government Licence - British Columbia"] = (
        "Open Government Licence - British Columbia"
    )
    reviewStatus: Literal["unreviewed"] = "unreviewed"
    rawResponse: dict[str, Any]
    rawResponseText: str


class SearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: Literal["sr-address-search.v1"] = VERSION
    query: str
    status: Literal["candidates", "no_match", "unavailable", "malformed", "rate_limited"]
    reason: str | None = None
    candidates: list[Candidate] = Field(max_length=5)
    mayBeTruncated: bool = False
    source: SourceCapture | None = None
