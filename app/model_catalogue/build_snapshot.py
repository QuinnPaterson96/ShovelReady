"""Export/check the source-attributed catalogue consumed directly by the UI.

Facts are manual transcriptions from the named provider pages captured 2026-09-25.
No provider API, live fetch, or publication occurs here.
"""
# ruff: noqa: E501

import argparse
import json
from pathlib import Path

from app.model_catalogue.catalogue import Catalogue

OUTPUT = Path(__file__).with_name("catalogue.json")
DATE = "2026-09-25"


def source(source_id, url, locator, digest, revision=None, artifact_status="capture_gap"):
    return dict(
        source_id=source_id,
        url=url,
        locator=locator,
        captured_at=DATE,
        sha256=digest,
        artifact_status=artifact_status,
        upstream_revision=revision,
    )


def quantity(value, unit, original_text):
    from decimal import Decimal

    factor = {"ft": Decimal("0.3048"), "ft2": Decimal("0.09290304")}[unit]
    normalized = "m" if unit == "ft" else "m2"
    return dict(
        original_text=original_text,
        original_value=value,
        original_unit=unit,
        dimension="length" if unit == "ft" else "area",
        value=str(Decimal(value) * factor),
        unit=normalized,
        basis=None,
    )


def known(name, value, unit, text, definition, source_id):
    return dict(
        name=name,
        status="known",
        definition=definition,
        quantity=quantity(value, unit, text),
        source_id=source_id,
        reason=None,
    )


def missing(name, definition, reason):
    return dict(
        name=name,
        status="missing",
        definition=definition,
        quantity=None,
        source_id=None,
        reason=reason,
    )


def build():
    landing = source(
        "landing-page",
        "https://www.clickmodular.com/the-landing",
        "The Landing > Compact & Cost Conscious; This model includes > Dimensions",
        "852ecb9cc0202b4385cb17b0f69e46849e86924bf15f835bfd5ba1e90e55cfad",
        "Public drawing image dated 2024-04-18; current model revision unknown",
        artifact_status="private_capture",
    )
    click_home = source(
        "click-home",
        "https://www.clickmodular.com/home",
        "Why Should I Buy A Modular Home? > What's Not Included; Serving BC's Sunshine Coast",
        "32dad61cd071a88c9ac5ca7977baffd4467272575ac59c2527e32672adf88d0b",
    )

    def aux(model, digest):
        return source(
            f"aux-{model}-page",
            f"https://www.auxbox.ca/model-{model}",
            "The Specs > Dimensions; Site Prep, Delivery + Installation",
            digest,
        )

    common_aux_missing = (
        "Controlled configuration and drawing revision",
        "Roof high point and height datum",
        "Overhang/projection envelope",
        "Foundation and installed grade relationship",
        "Regulatory floor area and occupancy footprint",
        "Victoria site delivery and installation confirmation",
    )
    return dict(
        schema_version="sr-40.catalogue.v1",
        snapshot_id="sr-40.2026-09-25.provider-pages.v1",
        captured_at=DATE,
        provenance="manual_transcription_of_public_provider_specs",
        review_status="unreviewed",
        models=[
            dict(
                model_id="click-landing",
                provider="Click Modular Homes",
                name="The Landing",
                provider_url=landing["url"],
                source_revision=None,
                configuration="Public one-bedroom product page; options not fixed",
                construction_method="Modular, per provider",
                intended_use_note="Advertised for ADU/cabin/guest cottage; Victoria garden-suite use unreviewed",
                service_area_status="excluded_by_provider",
                service_area_note="Provider homepage says near-term projects only on the Sunshine Coast; Victoria service not established.",
                installation_note="Provider describes drop-on-the-spot module. Site work, foundation, services, stairs/decking, shipping and installation are excluded from its listed package.",
                footprint_note="14 × 41 ft is a nominal product dimension. Wall, roof overhang and occupancy footprint boundaries are unverified; 574 ft² headline area is not a verified footprint.",
                height_note="9 ft is interior ceiling height only. Installed roof/building height and datum are unknown.",
                missing_facts=(
                    "Controlled current revision and options",
                    "Wall and projection dimensions",
                    "Installed roof/eave height and grade datum",
                    "Regulatory area",
                    "Victoria service confirmation",
                ),
                sources=[landing, click_home],
                review_status="unreviewed",
                measurements=[
                    known(
                        "nominal_exterior_width",
                        "14",
                        "ft",
                        "14 ft",
                        "Provider nominal dimension; wall-face/projection basis unverified",
                        "landing-page",
                    ),
                    known(
                        "nominal_exterior_depth",
                        "41",
                        "ft",
                        "41 ft",
                        "Provider nominal dimension; wall-face/projection basis unverified",
                        "landing-page",
                    ),
                    known(
                        "manufacturer_interior_area",
                        "520",
                        "ft2",
                        "520 sf (interior)",
                        "Provider-labelled interior area, not regulatory floor area",
                        "landing-page",
                    ),
                    missing(
                        "manufacturer_footprint",
                        "Occupied plan footprint including relevant projections",
                        "Headline 574 ft² is not defined as occupancy footprint",
                    ),
                    missing(
                        "advertised_overall_height",
                        "Provider exterior height and its reference",
                        "Only interior ceiling height was found",
                    ),
                    missing(
                        "roof_height",
                        "Roof high point measured from stated foundation datum",
                        "Installed roof high point, foundation datum and roof options missing",
                    ),
                ],
            ),
            dict(
                model_id="aux-240",
                provider="aux box",
                name="Model 240",
                provider_url="https://www.auxbox.ca/model-240",
                source_revision=None,
                configuration="Public model page; bath/kitchen options not fixed",
                construction_method="Factory-built structure, per provider",
                intended_use_note="Provider calls it a studio dwelling/short-term accommodation; Victoria residential use unreviewed",
                service_area_status="provider_claim",
                service_area_note="Provider says delivered anywhere in North America; Victoria project service and site feasibility unconfirmed.",
                installation_note="Provider says crane placement; permitting, foundation, site services, shipping and installation are separate site work/costs.",
                footprint_note="Provider labels 240 ft² a footprint, but roof overhangs and covered deck treatment are undefined.",
                height_note="Provider exterior height 10 ft 3 in has no stated datum or roof-point definition; cannot populate regulatory building height.",
                missing_facts=common_aux_missing,
                sources=[
                    aux("240", "5b565c75165e624be63d0d65c4f1ae7ca2a933605aefde89a13abda842708408")
                ],
                review_status="unreviewed",
                measurements=[
                    known(
                        "nominal_exterior_width",
                        "10",
                        "ft",
                        "10 ft",
                        "Provider exterior width; overhang inclusion unknown",
                        "aux-240-page",
                    ),
                    known(
                        "nominal_exterior_depth",
                        "24.083333333333333333",
                        "ft",
                        "24 ft 1 in",
                        "Provider exterior length; overhang inclusion unknown",
                        "aux-240-page",
                    ),
                    known(
                        "manufacturer_interior_area",
                        "146",
                        "ft2",
                        "146 sq ft total living space",
                        "Provider living space, not regulatory floor area",
                        "aux-240-page",
                    ),
                    known(
                        "manufacturer_footprint",
                        "240",
                        "ft2",
                        "240 sq ft footprint",
                        "Provider footprint; projections/deck basis unknown",
                        "aux-240-page",
                    ),
                    known(
                        "advertised_overall_height",
                        "10.25",
                        "ft",
                        "10 ft 3 in",
                        "Provider exterior height; datum/roof point unspecified",
                        "aux-240-page",
                    ),
                    missing(
                        "roof_height",
                        "Roof high point measured from stated foundation datum",
                        "Exterior height has no stated datum or roof-point definition",
                    ),
                ],
            ),
            dict(
                model_id="aux-300",
                provider="aux box",
                name="Model 300",
                provider_url="https://www.auxbox.ca/model-300",
                source_revision=None,
                configuration="Public one-bedroom product page; upgrades not fixed",
                construction_method="Factory-built structure, per provider",
                intended_use_note="Provider calls it long-term accommodation; Victoria garden-suite use unreviewed",
                service_area_status="provider_claim",
                service_area_note="Provider says delivered anywhere in North America; Victoria project service and site feasibility unconfirmed.",
                installation_note="Provider says crane placement; permitting, foundation, site services, shipping and installation are separate site work/costs.",
                footprint_note="Provider labels 300 ft² a footprint, but roof overhangs and other projection treatment are undefined.",
                height_note="Provider exterior height 10 ft 6 in has no stated datum or roof-point definition; cannot populate regulatory building height.",
                missing_facts=common_aux_missing,
                sources=[
                    aux("300", "722369c4af220b4d29984b989d940d3b96c40d98515182c2c4bbc28893184dca")
                ],
                review_status="unreviewed",
                measurements=[
                    known(
                        "nominal_exterior_width",
                        "10",
                        "ft",
                        "10 ft",
                        "Provider exterior width; overhang inclusion unknown",
                        "aux-300-page",
                    ),
                    known(
                        "nominal_exterior_depth",
                        "30",
                        "ft",
                        "30 ft",
                        "Provider exterior length; overhang inclusion unknown",
                        "aux-300-page",
                    ),
                    known(
                        "manufacturer_interior_area",
                        "226",
                        "ft2",
                        "226 sq ft total living space",
                        "Provider living space, not regulatory floor area",
                        "aux-300-page",
                    ),
                    known(
                        "manufacturer_footprint",
                        "300",
                        "ft2",
                        "300 sq ft footprint",
                        "Provider footprint; projections/deck basis unknown",
                        "aux-300-page",
                    ),
                    known(
                        "advertised_overall_height",
                        "10.5",
                        "ft",
                        "10 ft 6 in",
                        "Provider exterior height; datum/roof point unspecified",
                        "aux-300-page",
                    ),
                    missing(
                        "roof_height",
                        "Roof high point measured from stated foundation datum",
                        "Exterior height has no stated datum or roof-point definition",
                    ),
                ],
            ),
        ],
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    payload = Catalogue.model_validate(build())
    content = json.dumps(payload.model_dump(mode="json"), indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
            raise SystemExit("catalogue snapshot drift")
        print("catalogue snapshot verified")
    else:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
        print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
