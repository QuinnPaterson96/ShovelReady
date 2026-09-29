"""Small synchronous adapter for the public BC Address Geocoder addresses resource."""

import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError

from app.address_search.models import (
    AddressParts,
    Candidate,
    Fault,
    Point,
    SearchRequest,
    SearchResponse,
    SourceCapture,
)

ENDPOINT = "https://geocoder.api.gov.bc.ca/addresses.json"
MAX_BYTES = 100_000
TIMEOUT_SECONDS = 4
ADDRESS_FIELDS = tuple(AddressParts.model_fields)


class ProviderFailure(Exception):
    def __init__(self, status: str, reason: str):
        self.status = status
        self.reason = reason


def _strict_json(raw: bytes) -> dict[str, Any]:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate key")
            result[key] = value
        return result

    def nonfinite(_value: str) -> None:
        raise ValueError("nonfinite JSON number")

    value = json.loads(raw, object_pairs_hook=pairs, parse_constant=nonfinite)
    if not isinstance(value, dict):
        raise ValueError("response is not an object")
    return value


def _string(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    raise ValueError("invalid address field")


def _optional_string(value: Any) -> str | None:
    result = _string(value)
    return result or None


def _normalize(
    data: dict[str, Any], raw: bytes, url: str, fetched_at: datetime, request: SearchRequest
) -> SearchResponse:
    try:
        if data["type"] != "FeatureCollection" or data["queryAddress"] != request.query:
            raise ValueError("provider query mismatch")
        if data["crs"]["properties"]["code"] != 4326:
            raise ValueError("provider CRS mismatch")
        if data["maxResults"] != request.maxResults:
            raise ValueError("provider limit mismatch")
        features = data["features"]
        if not isinstance(features, list) or len(features) > request.maxResults:
            raise ValueError("provider candidate count invalid")
        candidates = []
        for index, feature in enumerate(features):
            if feature["type"] != "Feature" or feature["geometry"]["type"] != "Point":
                raise ValueError("invalid feature geometry")
            geometry = feature["geometry"]
            if geometry.get("crs", {}).get("properties", {}).get("code") != 4326:
                raise ValueError("candidate CRS mismatch")
            coordinates = geometry["coordinates"]
            if (
                not isinstance(coordinates, list)
                or len(coordinates) != 2
                or any(
                    isinstance(value, bool) or not isinstance(value, (int, float))
                    for value in coordinates
                )
            ):
                raise ValueError("invalid point")
            point = Point(longitude=coordinates[0], latitude=coordinates[1])
            props = feature["properties"]
            if not isinstance(props, dict):
                raise ValueError("invalid properties")
            address = AddressParts(**{name: _string(props[name]) for name in ADDRESS_FIELDS})
            full_address = _string(props["fullAddress"])
            if not full_address or not address.localityName:
                raise ValueError("missing address")
            faults = [
                Fault(
                    value=_string(fault["value"]),
                    element=_string(fault["element"]),
                    fault=_string(fault["fault"]),
                    penalty=fault["penalty"],
                )
                for fault in props["faults"]
            ]
            digest = hashlib.sha256(
                json.dumps(feature, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
            candidates.append(
                Candidate(
                    locator=f"{index}:{digest[:16]}",
                    fullAddress=full_address,
                    address=address,
                    locality=address.localityName,
                    providerSiteId=_optional_string(props["siteID"]),
                    score=props["score"],
                    matchPrecision=_string(props["matchPrecision"]),
                    faults=faults,
                    locationDescriptor=_string(props["locationDescriptor"]),
                    locationPositionalAccuracy=_string(props["locationPositionalAccuracy"]),
                    point=point,
                    sourceChangeDate=_optional_string(props["changeDate"]),
                )
            )
        source = SourceCapture(
            sourceUrl=url,
            fetchedAt=fetched_at,
            providerSearchTimestamp=_optional_string(data.get("searchTimestamp", "")),
            providerBaseDataDate=_optional_string(data.get("baseDataDate", "")),
            providerVersion=_optional_string(data.get("version", "")),
            responseSha256=hashlib.sha256(raw).hexdigest(),
            rawResponse=data,
            rawResponseText=raw.decode("utf-8"),
        )
        return SearchResponse(
            query=request.query,
            status="candidates" if candidates else "no_match",
            candidates=candidates,
            mayBeTruncated=len(candidates) == request.maxResults,
            source=source,
        )
    except (KeyError, TypeError, IndexError, ValueError, ValidationError) as exc:
        raise ProviderFailure("malformed", "Provider response failed validation") from exc


class GeocoderClient:
    def __init__(self, opener: Callable[..., Any] | None = None):
        self.opener = opener or urllib.request.urlopen

    def search(self, request: SearchRequest) -> SearchResponse:
        params = urllib.parse.urlencode(
            {
                "addressString": request.query,
                "maxResults": request.maxResults,
                "outputSRS": 4326,
                "echo": "true",
                "autoComplete": "false",
            }
        )
        url = f"{ENDPOINT}?{params}"
        headers = {"Accept": "application/json", "User-Agent": "ShovelReady-address-search/1.0"}
        key = os.environ.get("BC_GEOCODER_API_KEY")
        if key:
            headers["apikey"] = key
        outgoing = urllib.request.Request(url, headers=headers)
        for attempt in range(2):
            try:
                with self.opener(outgoing, timeout=TIMEOUT_SECONDS) as response:
                    if response.status != 200:
                        raise ProviderFailure(
                            "unavailable", "Provider returned an unexpected status"
                        )
                    content_type = response.headers.get("Content-Type", "")
                    if "json" not in content_type.lower():
                        raise ProviderFailure("malformed", "Provider did not return JSON")
                    raw = response.read(MAX_BYTES + 1)
                    if len(raw) > MAX_BYTES:
                        raise ProviderFailure("malformed", "Provider response exceeded size limit")
                    fetched_at = datetime.now(UTC)
                try:
                    data = _strict_json(raw)
                except (ValueError, UnicodeError) as exc:
                    raise ProviderFailure("malformed", "Provider returned invalid JSON") from exc
                return _normalize(data, raw, url, fetched_at, request)
            except urllib.error.HTTPError as exc:
                if exc.code == 429:
                    failure = ProviderFailure("rate_limited", "Provider rate limit reached")
                elif exc.code in (401, 403):
                    failure = ProviderFailure("unavailable", "Provider access is unavailable")
                else:
                    failure = ProviderFailure("unavailable", "Provider request failed")
                if exc.code >= 500 and attempt == 0:
                    continue
                break
            except (TimeoutError, urllib.error.URLError, OSError):
                failure = ProviderFailure("unavailable", "Provider connection failed or timed out")
                if attempt == 0:
                    continue
                break
            except ProviderFailure as exc:
                failure = exc
                break
        return SearchResponse(
            query=request.query, status=failure.status, reason=failure.reason, candidates=[]
        )
