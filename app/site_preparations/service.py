"""Project retained observations into unreviewed parcel leads, never legal sites."""

import os
import re
from typing import Literal

from app.contracts.common import Contract, Text
from app.investigation import Investigation

from .address_packet import AddressPacketError, read_packet


class Evidence(Contract):
    origin: Literal["source", "derived", "user"]
    snapshot_id: Text | None = None
    feature_index: int | None = None
    source_url: Text | None = None
    captured_at: str | None = None
    method: Text | None = None
    review_status: Literal["unreviewed"] = "unreviewed"


class Fact(Contract):
    value: str | float | None
    unit: str | None = None
    basis: str | None = None
    unresolved_reason: str | None = None
    evidence: Evidence


class ZoneContact(Contract):
    zone: Fact
    bylaw: Fact
    contact_area_m2: Fact
    classification: Literal["material", "sliver", "boundary_touch"]


class Candidate(Contract):
    candidate_id: Text  # Snapshot-scoped locator, never a permanent parcel identity.
    pid: Fact
    vic_pid: Fact
    address: Fact
    parcel_type: Fact
    parcel_status: Fact
    boundary: dict | None  # Original Esri rings, EPSG:3157; no survey inference.
    boundary_crs: Literal["EPSG:3157"] = "EPSG:3157"
    approximate_area_m2: Fact
    zones: tuple[ZoneContact, ...]
    constraints_status: Literal["not_queried"] = "not_queried"
    unresolved: tuple[str, ...]
    selected: Literal[False] = False


class Lookup(Contract):
    schema_version: Literal["sr-38.site-lookup.v1"] = "sr-38.site-lookup.v1"
    spatial_revision: Text
    collection: Text
    query_kind: Literal["pid", "address"]
    query: Text
    status: Literal["one_match", "ambiguous", "no_match", "unavailable"]
    coverage: Literal["three_retained_victoria_parcel_leads"] = (
        "three_retained_victoria_parcel_leads"
    )
    candidates: tuple[Candidate, ...]
    reason: str | None = None
    screening_status: Literal["not_performed"] = "not_performed"


def normalized_pid(value: str) -> str:
    digits = re.sub(r"[-\s]", "", value)
    if not re.fullmatch(r"\d{9}", digits):
        raise ValueError("PID must contain nine digits")
    return digits


def _address_keys(value: str) -> tuple[str, str]:
    """Keep all tokens except the two suffix pairs observed in the retained packet."""
    tokens = value.casefold().split()
    direct = " ".join(tokens)
    suffixes = {"st": "street", "street": "street", "ave": "avenue", "avenue": "avenue"}
    if tokens and tokens[-1] in suffixes:
        tokens[-1] = suffixes[tokens[-1]]
    return direct, " ".join(tokens)


def _fact(value, source, index, *, unit=None, basis=None, unresolved=None):
    return Fact(
        value=value,
        unit=unit,
        basis=basis,
        unresolved_reason=unresolved if value is None else None,
        evidence=Evidence(
            origin="source",
            snapshot_id=source.snapshot_id,
            feature_index=index,
            source_url=source.source_url,
            captured_at=source.captured_at.isoformat(),
        ),
    )


def candidates(investigation: Investigation) -> tuple[Candidate, ...]:
    spatial = investigation.spatial
    sources = {s.snapshot_id: s for s in investigation.sources}
    observations = {o.snapshot_id: o for o in spatial.observations}
    assessments = {(f.snapshot_id, f.feature_index): f for f in spatial.features}
    results = []
    for parcel in spatial.parcels:
        if parcel.parcel_feature_index is None:
            continue
        parcel_obs = observations[parcel.parcel_snapshot_id]
        parcel_source = sources[parcel.parcel_snapshot_id]
        index = parcel.parcel_feature_index
        feature = parcel_obs.response["features"][index]
        attributes = feature["attributes"]
        if not isinstance(attributes, dict):
            raise ValueError("Invalid parcel attributes")
        assessment = assessments[(parcel.parcel_snapshot_id, index)]
        zone_obs = observations[parcel.zoning_snapshot_id]
        zone_source = sources[parcel.zoning_snapshot_id]
        zones = []
        for contact in parcel.intersections:
            zone_attributes = zone_obs.response["features"][contact.zoning_feature_index][
                "attributes"
            ]
            if not isinstance(zone_attributes, dict):
                raise ValueError("Invalid zoning attributes")
            area = Fact(
                value=contact.area_m2,
                unit="m2",
                basis="EPSG:3157 XY parcel/zoning intersection, not regulatory area",
                evidence=Evidence(
                    origin="derived",
                    snapshot_id=contact.zoning_snapshot_id,
                    feature_index=contact.zoning_feature_index,
                    source_url=zone_source.source_url,
                    captured_at=zone_source.captured_at.isoformat(),
                    method="sr-09.xy.v1; parcel and zoning snapshot intersection",
                ),
            )
            zones.append(
                ZoneContact(
                    zone=_fact(
                        zone_attributes.get("Zoning"),
                        zone_source,
                        contact.zoning_feature_index,
                        unresolved="source field missing",
                    ),
                    bylaw=_fact(
                        zone_attributes.get("ZoningBylaw"),
                        zone_source,
                        contact.zoning_feature_index,
                        unresolved="source field missing",
                    ),
                    contact_area_m2=area,
                    classification=contact.classification,
                )
            )
        area = Fact(
            value=assessment.geometric_area_m2,
            unit="m2",
            basis=(
                "EPSG:3157 XY geometry area; approximate GIS value, "
                "not surveyed/regulatory lot area"
            ),
            unresolved_reason="unusable or missing polygon"
            if assessment.geometric_area_m2 is None
            else None,
            evidence=Evidence(
                origin="derived",
                snapshot_id=parcel.parcel_snapshot_id,
                feature_index=index,
                source_url=parcel_source.source_url,
                captured_at=parcel_source.captured_at.isoformat(),
                method="sr-09.xy.v1 Shapely polygon area from retained source rings",
            ),
        )
        results.append(
            Candidate(
                candidate_id=f"{parcel.parcel_snapshot_id}/{index}",
                pid=_fact(
                    attributes.get("PID"), parcel_source, index, unresolved="source field missing"
                ),
                vic_pid=_fact(
                    attributes.get("VicPID"),
                    parcel_source,
                    index,
                    unresolved="source field missing",
                ),
                address=_fact(None, parcel_source, index, unresolved="address join not captured"),
                parcel_type=_fact(
                    attributes.get("ParcelType"),
                    parcel_source,
                    index,
                    unresolved="source field missing",
                ),
                parcel_status=_fact(
                    attributes.get("ParcelStatus"),
                    parcel_source,
                    index,
                    unresolved="source field missing",
                ),
                boundary=feature.get("geometry"),
                approximate_area_m2=area,
                zones=tuple(zones),
                unresolved=(
                    "Parcel identity and boundaries require confirmation against survey/title",
                    "Constraints, principal building, legal rear yard and placement "
                    "not established",
                    *parcel.issues,
                ),
            )
        )
    return tuple(results)


def lookup(investigation: Investigation, kind: Literal["pid", "address"], query: str) -> Lookup:
    query = query.strip()
    if not query or len(query) > 200:
        raise ValueError("Query must contain 1 to 200 characters")
    if kind == "address":
        try:
            parcel_snapshots, address_revision, rows = read_packet()
        except (OSError, KeyError, TypeError, ValueError) as error:
            raise AddressPacketError("Retained address packet is invalid") from error
        selected_address_revision = os.environ.get("SHOVELREADY_ADDRESS_REVISION")
        actual_parcels = {parcel.parcel_snapshot_id for parcel in investigation.spatial.parcels}
        if (
            set(parcel_snapshots.values()) != actual_parcels
            or selected_address_revision != address_revision
        ):
            return Lookup(
                spatial_revision=investigation.spatial.identity.revision_id,
                collection=investigation.spatial.identity.logical_id,
                query_kind=kind,
                query=query,
                status="unavailable",
                candidates=(),
                reason=(
                    "No address capture is selected for this spatial revision; "
                    "set SHOVELREADY_ADDRESS_REVISION or use a PID/manual facts."
                ),
            )
        parcels = candidates(investigation)
        observations = {o.snapshot_id: o for o in investigation.spatial.observations}
        linked = {}
        for parcel in parcels:
            snapshot_id, index = parcel.candidate_id.rsplit("/", 1)
            gislink = observations[snapshot_id].response["features"][int(index)]["attributes"].get(
                "GISLINK"
            )
            if not isinstance(gislink, str) or not gislink:
                raise AddressPacketError("Retained parcel GISLINK missing")
            linked.setdefault(gislink, []).append(parcel)
        matches = []

        query_direct, query_suffix = _address_keys(query)
        for source_id, index, key, address, legal_type, receipt in rows:
            if key not in linked:
                raise AddressPacketError("Captured address has no retained parcel join")
            address_direct, address_suffix = _address_keys(address)
            direct_match = address_direct == query_direct
            if not direct_match and address_suffix != query_suffix:
                continue
            method = (
                "case/whitespace FullAddress match"
                if direct_match
                else "retained ST/STREET or AVE/AVENUE suffix-normalized FullAddress match"
            )
            for parcel in linked[key]:
                fact = Fact(
                    value=address,
                    basis=f"City Address Points Legal_Type={legal_type}; GISLINK={key}",
                    evidence=Evidence(
                        origin="source",
                        snapshot_id=f"{source_id}:sha256:{receipt['sha256']}",
                        feature_index=index,
                        source_url=receipt["requested_url"],
                        captured_at=receipt["captured_at_utc"],
                        method=f"{method}; captured GISLINK to retained parcel GISLINK",
                    ),
                )
                matches.append(parcel.model_copy(update={"address": fact}))
        return Lookup(
            spatial_revision=investigation.spatial.identity.revision_id,
            collection=investigation.spatial.identity.logical_id,
            query_kind=kind,
            query=query,
            status="no_match" if not matches else "one_match" if len(matches) == 1 else "ambiguous",
            candidates=tuple(matches),
            reason=(
                "No match among five retained address rows or supported suffix variants; "
                "use a PID or manual facts."
            )
            if not matches
            else None,
        )
    key = normalized_pid(query)
    matches = tuple(
        c
        for c in candidates(investigation)
        if isinstance(c.pid.value, str) and normalized_pid(c.pid.value) == key
    )
    return Lookup(
        spatial_revision=investigation.spatial.identity.revision_id,
        collection=investigation.spatial.identity.logical_id,
        query_kind=kind,
        query=query,
        status="no_match" if not matches else "one_match" if len(matches) == 1 else "ambiguous",
        candidates=matches,
        reason="No match among three retained leads; this does not establish absence from Victoria."
        if not matches
        else None,
    )
