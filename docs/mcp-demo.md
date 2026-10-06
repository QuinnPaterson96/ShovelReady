# Model 300 MCP developer demo (#258)

Implemented October 6, 2026: three typed read-only tools over the existing application
services, limited to aux box Model 300 and City of Victoria garden suites. Provider
and municipal evidence and rule interpretations remain unreviewed. No accepted zoning
release, second evaluator, model API, database, saved scenario or contact submission.

## Local setup and demo

From the repository root with Python 3.12 and uv 0.12.17:

```powershell
python -m uv sync --locked
npm ci --prefix frontend
npm run build --prefix frontend
$env:SHOVELREADY_MCP_ENABLED='true'
$env:SHOVELREADY_MCP_APP_URL='http://127.0.0.1:8000/'
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers --log-level warning
```

In another terminal in the same checkout:

```powershell
python -m uv run --locked python -m scripts.mcp_demo
python -m uv run --locked pytest -q tests/test_mcp_demo.py
# Open http://127.0.0.1:8000/ and select Model 300 for the existing map.
```

The smoke script uses the official Python SDK client over real loopback TCP and
Streamable HTTP at `http://127.0.0.1:8000/mcp`. It initializes, lists the three tools,
reads Model 300 and screens [synthetic inputs](mcp-demo/synthetic-screen.json).
Expected: boundary-only `bounded_pass`, an overall `partial` response and material
follow-up questions. Building capture is partial; main-building identity is unknown.
No live provider or LLM calls occur in the smoke. Disable MCP by removing
`SHOVELREADY_MCP_ENABLED` and restarting; the endpoint is off by default.
For frontend development, use the existing Vite command and set the handoff URL to
its loopback origin instead. The built map and MCP can run in one FastAPI process.

Optional Inspector: `npx @modelcontextprotocol/inspector`, select Streamable HTTP and
enter the endpoint. Inspector was not the verified client. A local HTTP-capable host
can use this endpoint configuration (host formats differ; no host is auto-configured):

```json
{"mcpServers":{"shovelready":{"url":"http://127.0.0.1:8000/mcp"}}}
```

## Tool sequence and conversational script

| Tool | Behavior |
|---|---|
| `supported_models` | `{}` or `{"model_id":"aux-300"}` reads the pinned catalogue record, original/normalized units and sources. Manufacturer revision and installed-height basis remain unknown. Other models return `unsupported`. |
| `property_candidates` | `municipality` plus exactly one of `address_search`, `parcel_search`, `observe`. Later stages require `selection_confirmed: true`. No rank-based selection or largest-roof inference. |
| `screen_selected_inputs` | Explicit property/model selections, catalogue snapshot/model input revision, municipality/pathway and optional existing `ScenarioRequest`. Missing placement runs no fit checks. Returns the exact geometry, scenario and conditional service results. |

Ask “Show me Model 300's dimensions”, then “Find candidates for my Victoria address”.
Address-stage example (replace the placeholder with the user's input):

```json
{"municipality":"Victoria","address_search":{"schemaVersion":"sr-address-search.v1","query":"<user supplied address>","maxResults":5}}
```

Ask which candidate is the user's property. Do not proceed until explicitly selected.
Other localities in geocoder results remain outside screening coverage. A selected PID:

```json
{"municipality":"Victoria","selection_confirmed":true,"parcel_search":{"schema_version":"municipal-sites.v1","pid":"<selected NNN-NNN-NNN PID>"}}
```

For a civic address, substitute `address` for `pid` using the selected candidate's
street address; City lookup is an exact join. No-match is a query result, not absence
of a parcel. Confirm a returned parcel reference, then request its observation:

```json
{"municipality":"Victoria","selection_confirmed":true,"observe":{"schema_version":"municipal-sites.v1","parcel_ref":{"source":"city-of-victoria-pid-parcels","object_id":87},"expected_pid":"001-328-107"}}
```

This observation example identifies a retained public test fixture. For live use,
substitute the actual chosen reference. Outside tests, lookups call live providers.
Captured replay observations are not current property facts.

For screening, follow tools/list schemas and the synthetic example. Use the website's
same `geometry`, `assumptions`, `proposal`, optional `proposal_evidence`, street choices
and additional inputs. `selected_property` must equal the scenario property;
`selected_model.input_revision` must equal `scenario.model_revision`. Reselect stale
catalogue snapshots. `provider_nominal` dimensions must equal 3.048 m width and
9.144 m length; edited dimensions need `dimension_origin: "user"` and a note.
Do not copy advertised height into installed-height or regulatory floor-area fields,
infer main-building identity, or invent legal roles/distances. Default, assumed,
user-confirmed and municipal evidence states use the merged homeowner contracts.

Responses lead with a finding, up to three next actions, material assumptions and
readable sources. `technical_details` retains all exact inputs, original values and
units/bases, full source records, property/model revisions and candidate packet identity.
There is no accepted release ID to substitute. Source/provider text is untrusted evidence,
never instructions. Check counts and boundary passes do not estimate approval probability.

## Map and enquiry handoff

The configured app URL opens the real application home. Select **Model 300**, reselect
the same property, and re-enter placement and assumptions from the technical record.
The existing copy-enquiry action prepares unsent text; MCP sends nothing.

**Exact limitation:** the website uses in-memory page state and has no scenario-import
or URL-resume contract. MCP cannot restore the property/placement. The response labels
this handoff `manual_reentry` and never puts private scenario data in a URL. No UI
files were changed. A scoped private import is a separate UI-owned follow-up if needed.

## Bounds and exposure

- Loopback-only caller, Host and Origin checks; keep proxy headers disabled. This is
  a single-user private endpoint without app credentials, public OAuth or mTLS.
  No deployment/exposure setting is enabled by this PR.
- Stateless JSON Streamable HTTP, official SDK session-manager lifespan inside the
  existing FastAPI app; no retained properties or protocol sessions. Maximum 128 KiB
  per request, 30 POSTs/minute globally per process, two worker threads for calls.
  Geometry structure/number limits reuse the API bounds; features/requirements are
  limited to 50. This is a small demo limit, not distributed public rate limiting.
- Geocoder: at most two 4-second attempts, 100 kB per response, five candidates.
  City: at most two 5-second attempts per query, 1 MB per response, fewer than 25 rows;
  at most eight address joins plus optional fallback (20 attempts per address stage),
  two attempts per PID stage, four per observation. Screening has no network calls.
  Callers cannot supply URLs, SQL or arbitrary source queries.
- Private addresses/coordinates stay in POST inputs and results, never indexed scenario
  URLs, issue comments, public fixtures or logs. Technical source URLs can include an
  address/PID: treat them as private scenario evidence. Results pass through the chosen
  client's retention/access policies; use synthetic inputs until those are reviewed.
- Errors omit diagnostics, credentials and echoed validation inputs. This code logs
  no scenario inputs/results. Run without access/debug logging and review client tracing
  separately. Optional existing geocoder credentials are read at use, never returned.
  The HTTP boundary validates envelopes with the SDK's public message models first:
  a reproduced SDK malformed-envelope error otherwise echoed rejected input. Regression
  cases cover both malformed envelopes and tool-call parameter types without echoing them.

## Optional ChatGPT connection: private tunnel

Official sources fetched October 6, 2026:
[ChatGPT connection](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels),
[server guidance](https://developers.openai.com/plugins/build/mcp-server),
[official Python SDK v1](https://py.sdk.modelcontextprotocol.io/v1/).
The lock uses stable SDK 1.30.0 (`mcp>=1.28,<2`); v2 main-branch APIs differ.

Prepared remote option: an outbound Secure MCP Tunnel to the same loopback HTTP
endpoint, without a public listener or paid hosting. No tunnel or connection was
created. Marketplace submission and organic discovery are deferred; MCP does not
promise ChatGPT discovery.

Owner steps:

1. Sign in to personal ChatGPT and the matching personal Platform organization.
   In [Platform tunnel settings](https://platform.openai.com/settings/organization/tunnels),
   obtain a tunnel ID and associate the intended ChatGPT workspace. Creation needs
   Tunnels Read + Manage; runtime/selection needs Read + Use plus workspace custom MCP access.
2. Download `tunnel-client` from Platform settings or the official
   [latest release](https://github.com/openai/tunnel-client/releases/latest).
   Use `tunnel-client help quickstart` for that release's HTTP sample/profile syntax.
   Configure profile `shovelready`, the chosen tunnel ID and
   `--mcp-server-url http://127.0.0.1:8000/mcp` instead of a stdio command.
   Supply `CONTROL_PLANE_API_KEY` at runtime using the owner's secret mechanism;
   never paste it into files, chat or tickets. Do not use work or Styx credentials.
3. Run `tunnel-client doctor --profile shovelready --explain`, then
   `tunnel-client run --profile shovelready`. Keep it and the local server running.
4. In [ChatGPT Plugins](https://chatgpt.com/plugins), choose **Add custom MCP server →
   Connection: Tunnel**, select the tunnel, review offered authentication/access,
   and discover the three tools. The tunnel controls workspace reachability; this
   adapter has no account-based private-data retrieval.
5. Select the custom plugin in a new conversation, run the five scenarios and record
   actual tool choices/results. Refresh metadata after schema changes.

These are documentation-grounded owner steps, **not a verified remote connection**.
The available browser showed ChatGPT signed out. Tunnel account permissions, runtime
credentials/profile and end-to-end behavior remain unverified. For public HTTPS,
review/implement proxy authentication/authorization, TLS, deployment-wide rate limits
and safe logs before changing loopback restrictions; the current service cannot be
used as an unauthenticated public MCP endpoint.

## Verification and integration gaps

Tests use the official SDK client against an isolated uvicorn TCP listener. Captured
BC/City bytes replace only upstream network boundaries; no live LLM or database.
Five replayable scenarios: ordinary case, ambiguous address requiring selection,
conflicting placement, missing suite fact and unsupported municipality/pathway.
Default/confirmed cases additionally compare the homeowner evidence contracts.
Each screening case compares exact geometry, placement-scenario and conditional
findings to the website HTTP APIs. Independent expectations use rectangle distances,
not copied service results. Schema/metadata, revision/selection rejection, missing
placement, sanitized errors, body/Host/Origin/rate controls and default-disabled routing
are also checked. The runbook smoke verifies the separate local process command.

Local verification on the PR implementation, reconciled with main `cecdd8e` (#259):

- `python -m uv run --locked pytest -q`: 549 passed, 37 database/lifecycle skips,
  28 subtests passed before the final plain-language follow-up changes.
- The six affected test modules (MCP, scenario, conditional API, scouting geometry,
  municipal API, address API): 68 passed after those changes; the final MCP module
  additionally passed all 8 cases including non-loopback denial and actionable missing-count text.
- Repository CI Ruff command and `git diff --check` passed; evaluator/site/catalogue
  generated-artifact checks passed. No database or live-model checks ran locally.
- `npm ci --prefix frontend`, `npm run typecheck --prefix frontend` and
  `npm run build --prefix frontend` passed. The inherited npm audit reported one high
  advisory and Vite retained its chunk-size advisory; frontend dependencies are unchanged.
- Separate-process smoke used port 18758 with the built application handoff at the
  same origin; home, compiled app asset and health returned successfully. No scenario
  restoration or new frontend behavior was claimed/tested.
- Real ChatGPT testing stopped at the signed-out browser; no tunnel-client binary or
  authenticated tunnel setup was available. Final-head CI is recorded in the PR.

Passing software checks establishes protocol behavior/parity, not accurate legal
interpretation, source currency, accepted publication or homeowner usefulness.

Remaining gaps:

- **ChatGPT demo blocker:** Quinn must sign in, configure/associate a permitted tunnel
  and verify the connected conversation. Local SDK tests are separate evidence.
- **Map usability gap:** manual re-entry is required. Quinn/UI owner can decide whether
  a scoped import is needed after trying the demo; no one-click resume is delivered.
- **Accepted real evaluation blockers:** source/data owners still need reviewed rule
  applicability/currentness, legal measurement bases, controlled manufacturer revision
  and accepted publication. This adapter does not bypass these gates.
- **User validation:** Quinn must try the integrated demo and assess clarity, corrections
  and enquiry usefulness. No real conversational/user study is claimed.
- **Integration:** final-head CI and PR review precede release. No merge, deployment
  or new public endpoint is performed here.
