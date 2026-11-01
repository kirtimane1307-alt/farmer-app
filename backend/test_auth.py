"""Automated test suite for Phase 4 Authentication & User Account System."""

import os
import sys
from uuid import UUID

# Setup path to backend
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.connection import get_db
from app.main import app
from app.models.user import User

# Configure an in-memory SQLite database specifically for test isolation
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create tables in the test database
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_tests():
    print("=" * 65)
    print(" Running Phase 4 Authentication Automated Tests")
    print("=" * 65)

    passed_count = 0

    # -------------------------------------------------------------
    # Test 1: User Registration Success
    # -------------------------------------------------------------
    reg_payload = {
        "name": "Sarah Jenkins",
        "email": "sarah.jenkins@agricore.com",
        "password": "FarmPassword2026!",
        "phone": "+1 555-0192",
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert "data" in data
    token_data = data["data"]
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] > 0
    user_info = token_data["user"]
    assert user_info["name"] == "Sarah Jenkins"
    assert user_info["email"] == "sarah.jenkins@agricore.com"
    assert user_info["phone"] == "+1 555-0192"
    assert "password" not in user_info
    assert "password_hash" not in user_info

    # Verify directly in SQLite that password_hash is securely hashed and not plain-text
    db = TestingSessionLocal()
    db_user = db.query(User).filter(User.email == "sarah.jenkins@agricore.com").first()
    assert db_user is not None
    assert db_user.password_hash.startswith("$2b$")
    assert db_user.password_hash != "FarmPassword2026!"
    db.close()
    print(" [PASS] 1. User Registration & Secure Password Hashing Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 2: Duplicate Email Rejection (Case-Insensitive)
    # -------------------------------------------------------------
    dup_payload = {
        "name": "Sarah Duplicate",
        "email": "SARAH.JENKINS@agricore.com",  # uppercase variant
        "password": "AnotherPassword123",
    }
    res = client.post("/api/auth/register", json=dup_payload)
    assert res.status_code == 400, f"Expected 400 for duplicate email, got {res.status_code}"
    print(" [PASS] 2. Duplicate Email & Case-Insensitive Check Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 3: Invalid Email Format Validation
    # -------------------------------------------------------------
    invalid_email_payload = {
        "name": "Invalid User",
        "email": "not-an-email",
        "password": "ValidPassword123!",
    }
    res = client.post("/api/auth/register", json=invalid_email_payload)
    assert res.status_code == 422, f"Expected 422 for invalid email, got {res.status_code}"
    print(" [PASS] 3. Invalid Email Format Rejected (422) Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 4: Short Password Validation (< 8 characters)
    # -------------------------------------------------------------
    short_pwd_payload = {
        "name": "Short Pass User",
        "email": "short@agricore.com",
        "password": "short",
    }
    res = client.post("/api/auth/register", json=short_pwd_payload)
    assert res.status_code == 422, f"Expected 422 for short password, got {res.status_code}"
    print(" [PASS] 4. Minimum Password Length Validation Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 5: User Login Success
    # -------------------------------------------------------------
    login_payload = {
        "email": "sarah.jenkins@agricore.com",
        "password": "FarmPassword2026!",
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    login_data = res.json()["data"]
    access_token = login_data["access_token"]
    assert access_token is not None
    assert login_data["user"]["email"] == "sarah.jenkins@agricore.com"
    print(" [PASS] 5. Valid Credentials Login & JWT Issue Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 6: Login with Incorrect Password
    # -------------------------------------------------------------
    wrong_pwd_payload = {
        "email": "sarah.jenkins@agricore.com",
        "password": "WrongPassword!",
    }
    res = client.post("/api/auth/login", json=wrong_pwd_payload)
    assert res.status_code == 401, f"Expected 401 for wrong password, got {res.status_code}"
    print(" [PASS] 6. Invalid Password Handled Safely (401) Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 7: Login with Non-Existent Account
    # -------------------------------------------------------------
    unknown_user_payload = {
        "email": "nonexistent@agricore.com",
        "password": "SomePassword123!",
    }
    res = client.post("/api/auth/login", json=unknown_user_payload)
    assert res.status_code == 401, f"Expected 401 for unknown user, got {res.status_code}"
    print(" [PASS] 7. Unknown Account Handled Safely (401) Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 8: Current User (/api/auth/me) with Valid Token
    # -------------------------------------------------------------
    headers = {"Authorization": f"Bearer {access_token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    me_data = res.json()["data"]
    assert me_data["name"] == "Sarah Jenkins"
    assert me_data["email"] == "sarah.jenkins@agricore.com"
    assert "password" not in me_data
    assert "password_hash" not in me_data
    print(" [PASS] 8. Authenticated Current-User (/api/auth/me) Retrieval Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 9: Protected Endpoint with Missing / Invalid Token
    # -------------------------------------------------------------
    client.cookies.clear()
    res_no_auth = client.get("/api/auth/me")
    assert res_no_auth.status_code == 401, "Expected 401 without token"

    res_bad_token = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res_bad_token.status_code == 401, "Expected 401 with invalid token"
    print(" [PASS] 9. Unauthorized & Invalid Token Rejection Verified")
    passed_count += 1

    # -------------------------------------------------------------
    # Test 10: Logout Endpoint
    # -------------------------------------------------------------
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200
    assert res_logout.json()["success"] is True
    print(" [PASS] 10. Logout & Session Termination Verified")
    passed_count += 1

    print("=" * 65)
    print(f" ALL {passed_count}/10 AUTHENTICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
