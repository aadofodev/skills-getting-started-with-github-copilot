import copy
import pytest
from urllib.parse import quote

from fastapi.testclient import TestClient

import src.app as app_module


# Snapshot initial activities so tests can reset state between runs
INITIAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Reset the in-memory activities store before each test
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(INITIAL_ACTIVITIES))
    yield


client = TestClient(app_module.app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Basic sanity check: expected activity keys present
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"].get("participants"), list)


def test_signup_and_remove_participant_flow():
    activity = "Basketball Club"
    email = "tester@example.com"

    # Sign up
    path = f"/activities/{quote(activity)}/signup"
    resp = client.post(path, params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant present
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    assert email in participants

    # Duplicate signup should fail
    resp = client.post(path, params={"email": email})
    assert resp.status_code == 400

    # Remove participant
    del_path = f"/activities/{quote(activity)}/participants"
    resp = client.delete(del_path, params={"email": email})
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")

    # Verify removed
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    assert email not in participants


def test_signup_nonexistent_activity():
    path = f"/activities/{quote('No Such Club')}/signup"
    resp = client.post(path, params={"email": "x@y.com"})
    assert resp.status_code == 404


def test_remove_nonexistent_activity_or_participant():
    # Non-existent activity
    path = f"/activities/{quote('No Such Club')}/participants"
    resp = client.delete(path, params={"email": "x@y.com"})
    assert resp.status_code == 404

    # Existing activity but non-existent participant
    activity = "Chess Club"
    path = f"/activities/{quote(activity)}/participants"
    resp = client.delete(path, params={"email": "not-in-list@example.com"})
    assert resp.status_code == 404
