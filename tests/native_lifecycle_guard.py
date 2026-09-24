"""Opt-in CI plugin: selection or skip is never native lifecycle verification."""

import pytest

NODE = "tests/test_local_database.py::test_native_lifecycle"


class NativeLifecycleGuard:
    def __init__(self):
        self.passed = set()

    def pytest_runtest_logreport(self, report):
        if report.nodeid == NODE and report.passed:
            self.passed.add(report.when)

    @pytest.hookimpl(hookwrapper=True)
    def pytest_runtest_makereport(self, item, call):
        yield
        if call.excinfo and call.excinfo.typename != "Skipped":
            reporter = item.config.pluginmanager.get_plugin("terminalreporter")
            if reporter:
                # Exception messages/locals can contain credentials or SQL payloads.
                reporter.write_line(f"Safe diagnostic: {item.nodeid} ({call.when}): "
                                    f"{call.excinfo.typename}")
                for entry in call.excinfo.traceback:
                    reporter.write_line(f"  {entry.path.name}:{entry.lineno + 1} "
                                        f"in {entry.name}")

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
