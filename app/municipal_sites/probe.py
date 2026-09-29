"""Opt-in bounded public-source probe: python -m app.municipal_sites.probe.

No owner/contact fields are requested, and ordinary tests never run this module.
"""

import json

from .api import VERSION, ObserveRequest, ParcelRef, SearchRequest, observe, search


def main():
    cases = (
        ("1144 MAY ST", "001-328-107", 87),
        ("1170 MAY ST", "008-140-723", 80),
        ("1253 QUEENS AVE", "028-279-638", 59),
    )
    for address, pid, oid in cases:
        result = search(SearchRequest(schema_version=VERSION, address=address))
        observation = observe(
            ObserveRequest(
                schema_version=VERSION,
                parcel_ref=ParcelRef(source="city-of-victoria-pid-parcels", object_id=oid),
                expected_pid=pid,
            )
        )
        print(
            json.dumps(
                {
                    "address": address,
                    "expected_pid": pid,
                    "expected_object_id": oid,
                    "search_status": result["status"],
                    "candidate_refs": [c["parcel_ref"] for c in result["candidates"]],
                    "relations": [c["relation"] for c in result["candidates"]],
                    "observation_status": observation["status"],
                    "parcel_area_m2": observation["parcel"]["area_m2"]
                    if observation["parcel"]
                    else None,
                    "intersecting_roofline_count": len(observation["rooflines"]),
                    "issues": observation["issues"],
                    "captured_at_utc": observation["evidence"][0]["captured_at_utc"],
                },
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
