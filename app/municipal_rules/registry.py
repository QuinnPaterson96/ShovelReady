"""Explicit registration of supported municipal packages; never load source-supplied code."""

from . import saanich, victoria
from .models import EvaluationRequest, EvaluationResult

PACKAGES = {
    "ca-bc-victoria": victoria,
    "ca-bc-saanich": saanich,
}


def catalogue():
    return {
        "schema_version": "municipal-rules.catalogue.v1",
        "profiles": [package.profile().model_dump(mode="json") for package in PACKAGES.values()],
    }


def selected(request: EvaluationRequest):
    package = PACKAGES.get(request.jurisdiction_id)
    if package is None or package.profile().pathway_id != request.pathway_id:
        raise ValueError("Municipality and pathway combination is unsupported")
    return package


def evaluate(request: EvaluationRequest) -> EvaluationResult:
    package = selected(request)
    profile = package.profile()
    result, findings = package.evaluate(request.payload)
    return EvaluationResult(
        jurisdiction_id=profile.jurisdiction_id,
        pathway_id=profile.pathway_id,
        package_revision=profile.revision,
        scope=profile.scope,
        screening=result,
        findings=findings,
    )
