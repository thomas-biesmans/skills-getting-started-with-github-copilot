from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def test_root_redirect():
    response = client.get("/")
    assert response.status_code in [200, 307]  # Either direct response or redirect is fine
    if response.status_code == 307:
        assert response.headers["location"] == "/static/index.html"

def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    activities = response.json()
    assert "Chess Club" in activities
    assert "Programming Class" in activities
    assert isinstance(activities["Chess Club"]["participants"], list)

def test_signup_success():
    response = client.post("/activities/Chess Club/signup?email=test@mergington.edu")
    assert response.status_code == 200
    assert response.json()["message"] == "Signed up test@mergington.edu for Chess Club"

    # Verify the participant was added
    activities = client.get("/activities").json()
    assert "test@mergington.edu" in activities["Chess Club"]["participants"]

def test_signup_duplicate():
    # Try to sign up the same email twice
    client.post("/activities/Chess Club/signup?email=duplicate@mergington.edu")
    response = client.post("/activities/Chess Club/signup?email=duplicate@mergington.edu")
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"]

def test_signup_nonexistent_activity():
    response = client.post("/activities/Nonexistent Club/signup?email=test@mergington.edu")
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]

def test_unregister_success():
    # First sign up a participant
    email = "unregister_test@mergington.edu"
    client.post(f"/activities/Chess Club/signup?email={email}")
    
    # Then unregister them
    response = client.post(f"/activities/Chess Club/unregister?email={email}")
    assert response.status_code == 200
    assert response.json()["message"] == f"Unregistered {email} from Chess Club"
    
    # Verify the participant was removed
    activities = client.get("/activities").json()
    assert email not in activities["Chess Club"]["participants"]

def test_unregister_not_registered():
    response = client.post("/activities/Chess Club/unregister?email=notregistered@mergington.edu")
    assert response.status_code == 404
    assert "Student is not registered" in response.json()["detail"]

def test_unregister_nonexistent_activity():
    response = client.post("/activities/Nonexistent Club/unregister?email=test@mergington.edu")
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]

def test_signup_full_activity():
    # First, create a test activity with a low max capacity
    activity_name = "Chess Club"
    activities = client.get("/activities").json()
    current_participants = activities[activity_name]["participants"]
    max_participants = activities[activity_name]["max_participants"]
    
    # Fill up the activity to max capacity
    test_emails = [f"full_test_{i}@mergington.edu" for i in range(max_participants - len(current_participants))]
    for email in test_emails:
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response.status_code == 200

    # Try to sign up one more participant
    response = client.post(f"/activities/{activity_name}/signup?email=overflow@mergington.edu")
    assert response.status_code == 400
    assert "Activity is full" in response.json()["detail"]

def test_remove_all_participants():
    # First, get a test activity
    activity_name = "Programming Class"
    activities = client.get("/activities").json()
    initial_participants = activities[activity_name]["participants"].copy()
    
    # Remove each participant one by one
    for participant in initial_participants:
        response = client.post(f"/activities/{activity_name}/unregister?email={participant}")
        assert response.status_code == 200
        assert f"Unregistered {participant}" in response.json()["message"]
    
    # Verify the activity now has no participants
    updated_activities = client.get("/activities").json()
    assert len(updated_activities[activity_name]["participants"]) == 0
    
    # Try to unregister from empty activity
    response = client.post(f"/activities/{activity_name}/unregister?email={initial_participants[0]}")
    assert response.status_code == 404
    assert "Student is not registered" in response.json()["detail"]