# Proposed conditional-screening boundary

This is an interface proposal for the integration worker, not an accepted-data contract or implementation. The candidate packet is read-only. The evaluator must explicitly opt into `conditional_scouting` and must never promote this packet into an accepted release or accepted evaluation.

```ts
type EvidenceValue<T> = {
  value: T | null;
  origin: "city_capture" | "controlled_design" | "user_assumption" | "reviewed_survey";
  sourceLabel: string;
  sourceUrl?: string;
  capturedAt?: string;
  geometryRevision?: string;
  designRevision?: string;
  measurementDefinition?: string;
};

type CandidateScreenRequestV1 = {
  schemaVersion: "victoria-garden-suite-scouting.request.v1";
  mode: "conditional_scouting";
  packetId: string;
  packetRevision: string;
  legalLot: EvidenceValue<string>;
  instrument: EvidenceValue<"zb2018" | "other" | "unknown">;
  zone: EvidenceValue<"GRD-1" | "other" | "unknown">;
  principalBuildingType: EvidenceValue<"single_detached" | "duplex" | "other" | "unknown">;
  principalBuildingId: EvidenceValue<string>;
  existingGardenSuiteCount: EvidenceValue<number>;
  proposal: {
    use: EvidenceValue<"garden_suite" | "other" | "unknown">;
    isNewConstruction: EvidenceValue<boolean>;
    attachedToFoundation: EvidenceValue<boolean>;
    floorArea?: EvidenceValue<{ value: string; unit: "m2"; basis: "part_2_1_floor_area" | "other" }>;
  };
  waterfront: {
    lot: EvidenceValue<boolean>;
    placementBetweenPrincipalAndWaterfront: EvidenceValue<boolean>;
  };
  exceptions: {
    siteSpecificProvisionOrVariance: EvidenceValue<boolean>;
    transitionPermitOrApplication: EvidenceValue<boolean>;
  };
  edges: Array<{
    edgeId: string;
    role: EvidenceValue<"front" | "rear" | "side" | "flanking_street" | "unknown">;
    streetAdjacency: EvidenceValue<boolean>;
    distanceToProposedBuildingFace?: EvidenceValue<{ value: string; unit: "m" }>;
  }>;
  separationFromPrincipal?: EvidenceValue<{ value: string; unit: "m"; basis: "reviewed_building_separation" | "roofline_gap" | "other" }>;
};

type CandidateCheckResultV1 = {
  logicalRuleId: string;
  proposedRevisionId: string;
  outcome: "meets_under_assumptions" | "apparent_conflict_under_assumptions" |
    "needs_information" | "not_applicable" | "unsupported";
  comparedValue?: string;
  threshold?: { operator: "<=" | ">="; value: string; unit: "count" | "m" | "m2" };
  measurementBasis: string;
  citedSource: { label: string; url: string; locators: string[]; capturedAt: string; reviewStatus: "unreviewed" };
  inputEvidence: Array<{ field: string; origin: string; sourceLabel: string; revision?: string }>;
  assumptions: string[];
  blockers: string[];
};
```

The response also needs packet identity, count of determinate/unresolved/outside-scope checks, outstanding prerequisites, source-currentness limitations and a separate list of checks omitted from this bounded packet. It must not include an overall legal or probable-approval verdict. Comparisons use unrounded values. A boundary result is per identified edge; one unresolved edge does not erase determinate results for other edges. If the instrument, zone, building use or exception status is unknown, the overall pathway is unresolved even if an independent geometric measurement is available. A conflicting placement says only that *this placement* conflicts under the assumptions.

`roofline_gap` and nominal exterior footprint cannot satisfy separation or Part 2.1 Floor Area. An edge role must be tied to the same geometry revision as its distance. A replaced property, design revision, placement, role or packet revision invalidates affected results immediately, including enquiry findings; an old asynchronous response cannot restore them. Unknown waterfront status cannot be silently treated as a non-waterfront case. The data packet's `source.review_status` and request evidence origins are different concepts and must be displayed separately.
