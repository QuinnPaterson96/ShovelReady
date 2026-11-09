"""Public municipal observation capabilities. Legal rule coverage is configured separately."""

from dataclasses import dataclass

VICTORIA = "city-of-victoria-pid-parcels"
SAANICH = "district-of-saanich-parcels"
VICTORIA_ROOT = "https://maps.victoria.ca/server/rest/services/OpenData/"
SAANICH_ROOT = "https://services7.arcgis.com/g5PyWjvBbQnqjM1q/arcgis/rest/services/"
LAND = VICTORIA_ROOT + "OpenData_Land/MapServer"
TRANSPORT = VICTORIA_ROOT + "OpenData_Transportation/MapServer"


@dataclass(frozen=True)
class Provider:
    name: str
    licence: str
    attribution: str


CITY = Provider(
    "City of Victoria Open Data",
    "https://opendata.victoria.ca/pages/open-data-licence",
    "Contains information licensed under the Open Government Licence - City of Victoria.",
)
DISTRICT = Provider(
    "District of Saanich Open Data",
    "https://www.saanich.ca/assets/Local~Government/Documents/SaanichDataCatalogueLicence.pdf",
    "Contains information licenced under the Open Government Licence – District of Saanich.",
)


PROVINCE = Provider(
    "Province of British Columbia (GeoBC)",
    "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc",
    "Contains information licensed under the Open Government Licence - British Columbia.",
)


@dataclass(frozen=True)
class Layer:
    url: str
    geometry: str
    provider: Provider


LAYERS = {
    "address": Layer(f"{LAND}/0", "esriGeometryPoint", CITY),
    "parcel": Layer(f"{LAND}/11", "esriGeometryPolygon", CITY),
    "building": Layer(f"{LAND}/1", "esriGeometryPolygon", CITY),
    "BC marine coastline": Layer(
        "https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/"
        "bcgw_pub_whse_basemapping/MapServer/91",
        "esriGeometryPolyline",
        PROVINCE,
    ),
    "Victoria water bodies": Layer(
        VICTORIA_ROOT + "OpenData_Environment/MapServer/5", "esriGeometryPolygon", CITY
    ),
    "Saanich water bodies": Layer(
        f"{SAANICH_ROOT}Waterbody/FeatureServer/0", "esriGeometryPolygon", DISTRICT
    ),
    "Victoria streets": Layer(f"{TRANSPORT}/25", "esriGeometryPolyline", CITY),
    "Victoria road areas": Layer(f"{TRANSPORT}/2", "esriGeometryPolygon", CITY),
    "Victoria blocks": Layer(f"{LAND}/9", "esriGeometryPolygon", CITY),
    "Saanich parcels": Layer(
        f"{SAANICH_ROOT}Parcel/FeatureServer/0", "esriGeometryPolygon", DISTRICT
    ),
    "Saanich buildings": Layer(
        f"{SAANICH_ROOT}Building/FeatureServer/0", "esriGeometryPolygon", DISTRICT
    ),
    "Saanich streets": Layer(
        f"{SAANICH_ROOT}Streets/FeatureServer/0", "esriGeometryPolyline", DISTRICT
    ),
}
SAANICH_PARCEL_FIELDS = "OBJECTID,PID,ADDRESS,SUBTYPE,JURISDICTION,GLOBALID"
VICTORIA_PARCEL_FIELDS = "OBJECTID,PID,VicPID,GISLINK,ParcelType,ParcelStatus,Shape_Area"


@dataclass(frozen=True)
class StreetSource:
    parcel: str
    streets: str
    name_field: str
    class_field: str
    classes: frozenset[str]
    blocks: str | None = None
    road_area: str | None = None


STREET_SOURCES = {
    VICTORIA: StreetSource(
        "parcel",
        "Victoria streets",
        "StreetName",
        "Class",
        frozenset(
            {
                "Local A",
                "Local B",
                "Local C",
                "Collector A",
                "Collector B",
                "Collector C",
                "Arterial A",
                "Arterial B",
                "Lane",
            }
        ),
        blocks="Victoria blocks",
        road_area="Victoria road areas",
    ),
    SAANICH: StreetSource(
        "Saanich parcels",
        "Saanich streets",
        "FULLSTREETNAME",
        "CLASS",
        frozenset({"Residential", "Major", "Collector", "Highway"}),
    ),
}


@dataclass(frozen=True)
class WaterArea:
    layer: str
    name_field: str
    # When supplied, only this named feature, corroborated by the marine coastline,
    # is eligible. Otherwise named inland water bodies supply their own labels.
    marine_record: str | None = None


@dataclass(frozen=True)
class WaterSource:
    parcel: str
    coast: str
    direct_coast: bool
    areas: tuple[WaterArea, ...]


WATER_SOURCES = {
    VICTORIA: WaterSource(
        "parcel",
        "BC marine coastline",
        direct_coast=False,
        areas=(WaterArea("Victoria water bodies", "Name", marine_record="Water"),),
    ),
    SAANICH: WaterSource(
        "Saanich parcels",
        "BC marine coastline",
        direct_coast=True,
        areas=(WaterArea("Saanich water bodies", "NAME"),),
    ),
}
