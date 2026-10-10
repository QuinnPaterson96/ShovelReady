"""Bounded read-only research capture; no production adapter or acceptance claim.

Run with requests, pyshp, shapely, pyproj and pypdf available. Downloads stay in
the OS temporary directory; only metadata summaries and six provincial samples
are retained here. No owner/contact attributes are requested or retained.
"""
import concurrent.futures as cf
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import tempfile
import zipfile

import requests

ROOT = Path(__file__).parent
TMP = Path(tempfile.gettempdir()) / "shovelready-crd-source-research"
TMP.mkdir(exist_ok=True)


def get(url, params=None):
    r = requests.get(url, params=params, timeout=35)
    r.raise_for_status()
    return r


def summary(entry):
    key, url = entry
    try:
        r = get(url, {"f": "pjson"})
        j = r.json()
        keep = ["error", "currentVersion", "serviceItemId", "name", "type",
                "description", "serviceDescription", "copyrightText", "geometryType",
                "extent", "spatialReference", "maxRecordCount", "capabilities",
                "supportedQueryFormats", "advancedQueryCapabilities", "editingInfo",
                "objectIdField", "fields", "layers", "tables", "folders", "services"]
        return key, {"url": r.url, "accessed_utc": dt.datetime.now(dt.UTC).isoformat(),
                     "http_status": r.status_code,
                     "metadata": {k: j[k] for k in keep if k in j}}
    except Exception as e:
        return key, {"url": url, "error": str(e)}


def metadata():
    saan = "https://map.saanich.ca/server/rest/services/MAPS/SaanichMapService_External/MapServer"
    lang = "https://arcex.langford.ca/server/rest/services/Parcel_Info_Map/"
    entries = [("oakbay-root", "https://maps.oakbay.ca/arcgis/rest/services"),
               ("saanich-root", saan),
               ("langford-root", lang + "Parcel_Info_Webmap_EB/MapServer"),
               ("langford-base", lang + "Parcels_Base/MapServer"),
               ("crd-properties", "https://mapservices.crd.bc.ca/arcgis/rest/services/Properties/MapServer"),
               ("crd-basemap", "https://mapservices.crd.bc.ca/arcgis/rest/services/Basemap/Basemap/MapServer")]
    entries += [(f"saanich-{i}", f"{saan}/{i}") for i in [2, 28]]
    entries += [(f"langford-info-{i}", lang + f"Parcel_Info_Webmap_EB/MapServer/{i}") for i in [10, 12, 30]]
    entries += [(f"langford-base-{i}", lang + f"Parcels_Base/MapServer/{i}") for i in [2, 5]]
    entries += [(f"crd-properties-{i}", f"https://mapservices.crd.bc.ca/arcgis/rest/services/Properties/MapServer/{i}") for i in [0, 3]]
    entries += [(f"crd-basemap-{i}", f"https://mapservices.crd.bc.ca/arcgis/rest/services/Basemap/Basemap/MapServer/{i}") for i in [1, 2]]
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        result = dict(ex.map(summary, entries))
    (ROOT / "service-metadata.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    for k, v in result.items():
        j = v.get("metadata", {})
        print(k, v.get("error", ""), j.get("name", ""), j.get("layers", j.get("services", "")), flush=True)


def provincial():
    from shapely.geometry import Point, shape
    from pyproj import Transformer
    cases = [("oakbay-transit", "867 Transit Rd, Oak Bay, BC"),
             ("oakbay-westdowne", "2939 Westdowne Rd, Oak Bay, BC"),
             ("saanich-kingsley", "3325 Kingsley St, Saanich, BC"),
             ("saanich-cedar", "4225 Cedar Hill Rd, Saanich, BC"),
             ("langford-lone-oak", "350 Lone Oak Pl, Langford, BC"),
             ("langford-jenkins", "1100 Jenkins Ave, Langford, BC")]
    results = []
    for key, address in cases:
        row = {"case": key, "requested_address": address,
               "accessed_utc": dt.datetime.now(dt.UTC).isoformat()}
        try:
            r = get("https://geocoder.api.gov.bc.ca/addresses.json", {
                "addressString": address, "maxResults": 3, "outputSRS": 4326})
            j = r.json()
            row["geocoder_url"] = r.url
            (ROOT / f"{key}-geocoder.json").write_text(json.dumps(j, indent=2), encoding="utf-8")
            row["candidates"] = [{"address": f["properties"].get("fullAddress"),
                                  "precision": f["properties"].get("matchPrecision"),
                                  "score": f["properties"].get("score"),
                                  "faults": f["properties"].get("faults"),
                                  "point": f["geometry"]} for f in j["features"]]
            x, y = j["features"][0]["geometry"]["coordinates"]
            r = get("https://openmaps.gov.bc.ca/geo/pub/wfs", {
                "service": "WFS", "version": "2.0.0", "request": "GetFeature",
                "typeNames": "pub:WHSE_CADASTRE.PMBC_PARCEL_POLY_SV", "count": 20,
                "outputFormat": "application/json",
                "bbox": f"{x-.00001},{y-.00001},{x+.00001},{y+.00001},EPSG:4326"})
            parcels = r.json()
            (ROOT / f"{key}-pmbc.json").write_text(json.dumps(parcels, indent=2), encoding="utf-8")
            row.update({"pmbc_url": r.url, "crs": parcels.get("crs"),
                        "numberMatched": parcels.get("numberMatched"),
                        "numberReturned": parcels.get("numberReturned")})
            crs = parcels["crs"]["properties"]["name"]
            pt = Point(*Transformer.from_crs(4326, crs, always_xy=True).transform(x, y))
            row["parcel_candidates"] = [{"id": f.get("id"), "properties": f["properties"],
                                          "geometry_type": f["geometry"]["type"],
                                          "valid": shape(f["geometry"]).is_valid,
                                          "covers_first_point": shape(f["geometry"]).covers(pt)}
                                         for f in parcels["features"]]
        except Exception as e:
            row["error"] = str(e)
        results.append(row)
        print(key, json.dumps(row), flush=True)
    (ROOT / "address-experiments.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    catalogue = {}
    for slug in ["parcelmap-bc-parcel-polygons-ogl", "bc-address-geocoder-web-service",
                 "municipalities-legally-defined-administrative-areas-of-bc", "digital-road-atlas-dra-master-partially-attributed-roads"]:
        try:
            r = get("https://catalogue.data.gov.bc.ca/api/3/action/package_show", {"id": slug})
            j = r.json()["result"]
            catalogue[slug] = {k: j.get(k) for k in ["id", "name", "title", "license_id", "license_title", "license_url", "metadata_modified", "notes", "resources"]}
        except Exception as e:
            catalogue[slug] = {"error": str(e)}
    (ROOT / "bc-catalogue.json").write_text(json.dumps(catalogue, indent=2), encoding="utf-8")


def saanich_files():
    import csv
    import shapefile
    from shapely.geometry import shape, Point
    from shapely.validation import explain_validity
    from pyproj import CRS
    prior = json.loads((ROOT.parents[1] / "municipality-transfer/saanich/spatial/manifest.json").read_text())
    archives = {}
    parcel_geoms = {}
    for name in ["AddressCSV.zip", "ParcelsSHP.zip", "BuildingsSHP.zip", "ZoningSHP.zip"]:
        r = get(prior["archives"][name]["url"])
        (TMP / name).write_bytes(r.content)
        z = zipfile.ZipFile(io.BytesIO(r.content))
        digest = hashlib.sha256(r.content).hexdigest()
        archives[name] = {"url": r.url, "accessed_utc": dt.datetime.now(dt.UTC).isoformat(),
                          "bytes": len(r.content), "sha256": digest,
                          "matches_september_25": digest == prior["archives"][name]["sha256"],
                          "members": z.namelist()}
        if name == "AddressCSV.zip":
            rows = list(csv.DictReader(io.StringIO(z.read("CivicAddress.csv").decode("utf-8-sig"))))
            selected = [r for r in rows if r.get("FULLADDRESS") in ["3325 KINGSLEY ST", "4225 CEDAR HILL RD"]]
            archives[name].update({"count": len(rows), "fields": list(rows[0]), "selected": selected})
        else:
            stem = name.removesuffix("SHP.zip")
            reader = shapefile.Reader(shp=io.BytesIO(z.read(stem+".shp")), dbf=io.BytesIO(z.read(stem+".dbf")), shx=io.BytesIO(z.read(stem+".shx")))
            archives[name].update({"count": len(reader), "fields": reader.fields[1:],
                                  "shape_type": reader.shapeTypeName,
                                  "crs_wkt": z.read(stem+".prj").decode()})
            if stem == "Parcels":
                kept = []
                for sr in reader.iterShapeRecords():
                    a = sr.record.as_dict()
                    if a.get("PID") in ["000-554-294", "002-559-790"]:
                        geom = sr.shape.__geo_interface__
                        kept.append({"source_index": sr.record.oid, "attributes": a, "geometry": geom,
                                     "valid": shape(geom).is_valid})
                        parcel_geoms[a["PID"]] = shape(geom)
                archives[name]["selected"] = kept
                for civic in archives["AddressCSV.zip"]["selected"]:
                    civic["parcel_point_contacts"] = [pid for pid, g in parcel_geoms.items()
                        if g.covers(Point(float(civic["EASTING"]), float(civic["NORTHING"])))]
            if stem == "Buildings":
                contacts = {pid: [] for pid in parcel_geoms}
                for sr in reader.iterShapeRecords():
                    g = shape(sr.shape.__geo_interface__)
                    for pid, lot in parcel_geoms.items():
                        if g.envelope.intersects(lot.envelope) and g.is_valid and g.intersects(lot):
                            contacts[pid].append({"source_index": sr.record.oid,
                                "attributes": sr.record.as_dict(), "valid": True,
                                "xy_overlap_m2": g.intersection(lot).area})
                archives[name]["selected_roof_contacts"] = contacts
            if stem == "Zoning":
                archives[name]["prior_record_audit"] = [{"index": i,
                    "attributes": reader.record(i).as_dict(),
                    "valid": shape(reader.shape(i).__geo_interface__).is_valid,
                    "validity": explain_validity(shape(reader.shape(i).__geo_interface__))}
                    for i in [1853, 1475, 1659, 1790]]
                contacts = {pid: [] for pid in parcel_geoms}
                for sr in reader.iterShapeRecords():
                    g = shape(sr.shape.__geo_interface__)
                    for pid, lot in parcel_geoms.items():
                        if g.envelope.intersects(lot.envelope):
                            if not g.is_valid or g.intersects(lot):
                                contacts[pid].append({"source_index": sr.record.oid,
                                    "attributes": sr.record.as_dict(), "valid": g.is_valid,
                                    "validity": explain_validity(g),
                                    "xy_overlap_m2": g.intersection(lot).area if g.is_valid else None,
                                    "contact_basis": "intersection" if g.is_valid else "envelope_only"})
                archives[name]["current_contacts"] = contacts
    (ROOT / "saanich-downloads.json").write_text(json.dumps(archives, indent=2), encoding="utf-8")
    print("Saanich fresh files", [(k, v["matches_september_25"], v.get("count")) for k,v in archives.items()], flush=True)


def documents():
    from pypdf import PdfReader
    urls = {
        "saanich-bylaw": "https://www.saanich.ca/assets/Local~Government/Documents/Planning/zone8200.pdf",
        "saanich-building-metadata": "https://map.saanich.ca/gisdata/Metadata/BuildingsMetadata.pdf",
        "saanich-parcel-metadata": "https://map.saanich.ca/gisdata/Metadata/ParcelsMetadata.pdf",
        "langford-part3": "https://langford.ca/wp-content/uploads/2023/04/Part-3-General-Regulations.pdf",
        "langford-definitions": "https://langford.ca/wp-content/uploads/2022/10/zoning-blyaw-part-1-interpretation.pdf",
        "langford-r2": "https://langford.ca/wp-content/uploads/2023/04/2_One-and-Two-Family-Residential-Zones.pdf",
        "langford-amendments": "https://langford.ca/wp-content/uploads/2023/04/List-of-Amendments-1.pdf",
        "oakbay-transit-plan": "https://onlineservice.oakbay.ca/WebApps/OurCity/Prospero/FileDownload.aspx?fileId=69548C260602113638282329&folderId=64600C260415103904605252",
        "oakbay-westdowne-plan": "https://onlineservice.oakbay.ca/WebApps/OurCity/Prospero/FileDownload.aspx?fileId=31B29BA1-66DE-4C27-BCAD-1BB4782EE081&folderId=35331C250604154543761007",
    }
    def one(entry):
        key, url = entry
        out = {"url": url, "accessed_utc": dt.datetime.now(dt.UTC).isoformat()}
        try:
            r = get(url)
            (TMP / (key + ".pdf")).write_bytes(r.content)
            pdf = PdfReader(io.BytesIO(r.content))
            texts = [p.extract_text() or "" for p in pdf.pages]
            (TMP / (key + ".txt")).write_text("\n\f\n".join(texts), encoding="utf-8")
            out.update({"bytes": len(r.content), "sha256": hashlib.sha256(r.content).hexdigest(),
                        "pages": len(pdf.pages), "http_status": r.status_code,
                        "text_read": True, "pdf_retained_in_repository": False})
        except Exception as e:
            out["error"] = str(e)
        return key, out
    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        data = dict(ex.map(one, urls.items()))
    (ROOT / "document-access.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(json.dumps(data, indent=2))


def boundaries():
    typename = "pub:WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP"
    r = get("https://openmaps.gov.bc.ca/geo/pub/wfs", {"service": "WFS", "version": "2.0.0",
        "request": "GetFeature", "typeNames": typename, "count": 10,
        "outputFormat": "application/json", "CQL_FILTER": "ADMIN_AREA_ABBREVIATION IN ('Oak Bay','Saanich','Langford')"})
    data = {"url": r.url, "accessed_utc": dt.datetime.now(dt.UTC).isoformat(), "response": r.json()}
    (ROOT / "municipal-boundaries.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    print([(f['properties'], f['geometry']['type']) for f in data['response'].get('features',[])])
    for name in ["WHSE_CADASTRE.PMBC_PARCEL_POLY_SV", "WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP"]:
        r = get("https://openmaps.gov.bc.ca/geo/pub/wfs", {"service":"WFS", "version":"2.0.0",
            "request":"DescribeFeatureType", "typeNames":"pub:"+name})
        (ROOT / (name.split('.')[-1]+"-schema.xml")).write_bytes(r.content)


if __name__ == "__main__":
    import sys
    {"metadata": metadata, "provincial": provincial, "saanich": saanich_files,
     "documents": documents, "boundaries": boundaries}[sys.argv[1] if len(sys.argv)>1 else "metadata"]()
