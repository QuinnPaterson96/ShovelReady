# Public City response fixtures

These are exact UTF-8 response bodies captured from City of Victoria MapServer layers 0, 11 and 1 on 2026-09-29 UTC for the already public 1144 MAY ST / PID 001-328-107 / parcel OBJECTID 87 case. No owner or contact fields were requested. The source query is reproduced by `tests/test_municipal_sites_api.py`; the response body is returned unaltered by its fake `urlopen` boundary. Licence: [Open Government Licence – City of Victoria](https://opendata.victoria.ca/pages/open-data-licence). Attribution: Contains information licensed under the Open Government Licence - City of Victoria.

| File | SHA-256 of original response bytes |
|---|---|
| `address_87.json` | `068d67187fb9c2e449258e171207fd43c4ce73de5a382f89da008695051eb4c8` |
| `parcel_search_87.json` | `734a9edaf67344ba57106598cbc02b406dd141c63c5a7a82a69afb5274c0aa9b` |
| `parcel_observe_87.json` | `649714594dd0193e22c0b14e27bccf4db59a325382a5050b814a57671e0bbe40` |
| `buildings_87.json` | `a6923018105d3bc48dfd24cfd19a2d87c0a47e70d98ae34f40b6705a5c1617f8` |

The probe and tests prove adapter behavior against saved bytes. These fixture bytes are not an independent accuracy review or a current City release. Named failure cases in the tests mutate these responses in memory and are synthetic.

`arcgis_pagination_error.json` is the public ArcGIS error envelope observed on October 2,
2026. It contains only code 400, the provider message and an empty details array; it has
no parcel or address data. The exact body may vary across provider instances.
