"""Run explicitly to verify pytest exits nonzero for a failing check.

Excluded from normal collection by its filename. Never include in CI's testpaths.
"""


def test_intentional_failure():
    raise AssertionError("CI failure probe")
