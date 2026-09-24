"""Opt-in CI plugin: selection or skip is never native lifecycle verification."""

import pytest

NODE = "tests/test_local_database.py::test_native_lifecycle"


class NativeLifecycleGuard:
    def __init__(self):
        self.passed = set()

    def pytest_runtest_logreport(self, report):
        if report.nodeid == NODE and report.passed:
            self.passed.add(report.when)

    def pytest_sessionfinish(self, session, exitstatus):
        if self.passed != {"setup", "call", "teardown"}:
            session.exitstatus = pytest.ExitCode.TESTS_FAILED
            reporter = session.config.pluginmanager.get_plugin("terminalreporter")
            if reporter:
                reporter.write_sep(
                    "!", f"Native lifecycle NOT verified: {NODE} must pass all phases", red=True
                )


def pytest_configure(config):
    config.pluginmanager.register(NativeLifecycleGuard(), "native-lifecycle-required")
