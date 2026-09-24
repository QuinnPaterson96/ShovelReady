"""Opt-in CI plugin: selection or skip is never native lifecycle verification."""

import csv
import ctypes
import os
import subprocess

import pytest

NODE = "tests/test_local_database.py::test_native_lifecycle"


@pytest.fixture(autouse=True)
def windows_scratch_owner(request, tmp_path, tmp_path_factory):
    """Elevated runners must give PostgreSQL's restricted token an actual user owner."""
    if (request.node.nodeid != NODE or os.name != "nt"
            or not ctypes.windll.shell32.IsUserAnAdmin()):
        return
    # Python's mode=0700 uses OWNER RIGHTS. Elevated Windows defaults the owner to
    # Administrators, which initdb deliberately strips from its restricted token.
    # Change ownership, never broaden ACLs or touch the installed service/data.
    identity = subprocess.check_output(["whoami", "/user", "/fo", "csv", "/nh"], text=True)
    sid = next(csv.reader([identity.strip()]))[1]
    scratch = tmp_path / "scratch"
    scratch.mkdir()
    for path in (tmp_path_factory.getbasetemp(), tmp_path, scratch):
        subprocess.run(["icacls", str(path), "/setowner", f"*{sid}"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


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
