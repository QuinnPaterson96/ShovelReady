import pytest

from tests.database_safety import require_disposable_database

URL = "postgresql://fixture:placeholder@127.0.0.1:55432/shovelready_test_" + "a" * 32
VALID = {
    "SHOVELREADY_ENV": "test",
    "SHOVELREADY_TEST_DATABASE_DISPOSABLE": "yes",
    "SHOVELREADY_TEST_DATABASE_URL": URL,
}


@pytest.mark.parametrize("missing", list(VALID))
def test_requires_explicit_configuration(missing):
    env = VALID.copy()
    del env[missing]
    with pytest.raises(ValueError, match="explicitly disposable"):
        require_disposable_database(env)


@pytest.mark.parametrize("url", [
    "", "not-a-url", URL.replace("127.0.0.1", "db.example.invalid"),
    URL.replace("127.0.0.1", "localhost"), URL.replace("55432", "invalid"),
    URL.replace("shovelready_test_", "production_"), URL + "?host=remote.invalid",
    URL + "#ignored", URL.replace("postgresql", "mysql"),
    URL.replace("a" * 32, "shared"), URL.replace(":55432", ""),
    URL.replace("127.0.0.1", "[invalid"),
])
def test_rejects_unsafe_targets_without_leaking_credentials(url):
    with pytest.raises(ValueError) as error:
        require_disposable_database({**VALID, "SHOVELREADY_TEST_DATABASE_URL": url})
    assert "placeholder" not in str(error.value)
    assert error.value.__cause__ is None


@pytest.mark.parametrize("overrides", [
    {"SHOVELREADY_ENV": "development"},
    {"SHOVELREADY_TEST_DATABASE_DISPOSABLE": "no"},
])
def test_rejects_non_test_environment(overrides):
    with pytest.raises(ValueError):
        require_disposable_database({**VALID, **overrides})


def test_accepts_explicit_disposable_target_without_connecting():
    assert require_disposable_database(VALID) == URL


def test_legacy_database_variable_cannot_enable_tests():
    with pytest.raises(ValueError):
        require_disposable_database({"DATABASE_URL": URL})
