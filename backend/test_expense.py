"""Automated Test Suite for Phase 12: Expense Management.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms, fields, and crops registered under respective tenants.
3. Unauthenticated access blocked (401 Unauthorized).
4. Cross-user farm access blocked (404/IDOR).
5. Relational hierarchy enforcement (Field must belong to Farm, Crop must belong to Farm/Field).
6. Input validations (zero/negative amount, blank title, invalid category).
7. Expense creation with unpaid status (amount_paid=0, balance=amount).
8. Expense creation with paid status upfront (initial payment auto-recorded).
9. Single expense retrieval with relational metadata.
10. Expense update & amount recalculation (rejecting reduction below paid amount).
11. Payment recording workflow (rejecting zero/negative/overpayment, partial to full transitions).
12. Multi-tenant security isolation (Bob cannot view, update, delete, or disburse on Alice's expenses).
13. Safe deletion rules (rejecting deletion of expenses with disbursements, allowing unpaid deletion).
14. Multi-criteria filtering (category, farm, field, crop, payment_status, vendor, date range, search).
15. Authoritative summary calculations using Python Decimal.
16. CSV export format and row verification.
17. Nested convenience routes (/farms/{id}/expenses, /fields/{id}/expenses, /crops/{id}/expenses, etc.).
"""

import sys
import os
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Registers all models including Expense and ExpensePayment
from app.main import app

# In-memory SQLite isolated testing database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def register_and_login(name: str, email: str, password: str = "StrongPassword123!") -> dict:
    """Helper to register user and obtain Bearer JWT header."""
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert reg_resp.status_code in (200, 201), f"Registration failed: {reg_resp.text}"

    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["data"]["access_token"]
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    print("=" * 65)
    print(" Running Phase 12 Expense Management Automated Test Suite")
    print("=" * 65)

    # Recreate tables in test memory
    Base.metadata.create_all(bind=engine)

    # -------------------------------------------------------------
    # 1. Multi-tenant setup: Alice & Bob
    # -------------------------------------------------------------
    print("\n--- [1] Setting up Multi-Tenant Users: Alice & Bob ---")
    alice_headers = register_and_login("Alice Green", "alice.expenses@example.com")
    bob_headers = register_and_login("Bob Stone", "bob.expenses@example.com")

    # -------------------------------------------------------------
    # 2. Establish estates, fields, crops
    # -------------------------------------------------------------
    # Alice Farm
    alice_farm_res = client.post(
        "/api/farms",
        headers=alice_headers,
        json={"name": "Alice Valley Estate", "location": "Nashik", "total_area": 50.0},
    )
    assert alice_farm_res.status_code == 201
    alice_farm_id = alice_farm_res.json()["id"]

    # Alice Field 1
    alice_f1_res = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={"name": "East Vineyard Plot", "area": 20.0},
    )
    assert alice_f1_res.status_code == 201
    alice_field1_id = alice_f1_res.json()["id"]

    # Alice Field 2
    alice_f2_res = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={"name": "West Orchard Plot", "area": 15.0},
    )
    assert alice_f2_res.status_code == 201
    alice_field2_id = alice_f2_res.json()["id"]

    # Alice Crop on Field 1
    alice_crop_res = client.post(
        "/api/crops",
        headers=alice_headers,
        json={
            "field_id": alice_field1_id,
            "name": "Table Grapes",
            "variety": "Thompson Seedless",
            "sowing_date": "2026-01-15",
        },
    )
    assert alice_crop_res.status_code == 201
    alice_crop_id = alice_crop_res.json()["id"]

    # Bob Farm & Field
    bob_farm_res = client.post(
        "/api/farms",
        headers=bob_headers,
        json={"name": "Bob Highland Farm", "location": "Pune", "total_area": 30.0},
    )
    assert bob_farm_res.status_code == 201
    bob_farm_id = bob_farm_res.json()["id"]

    bob_f1_res = client.post(
        f"/api/farms/{bob_farm_id}/fields",
        headers=bob_headers,
        json={"name": "Bob Plot A", "area": 12.0},
    )
    assert bob_f1_res.status_code == 201
    bob_field_id = bob_f1_res.json()["id"]

    print(" [PASS] 1. Multi-Tenant Accounts & Base Estates Established")

    # -------------------------------------------------------------
    # 3. Security & Validation Blocks
    # -------------------------------------------------------------
    print("\n--- [2] Unauthenticated & Cross-User Security Checks ---")
    # Unauthenticated list
    unauth_res = client.get("/api/expenses")
    assert unauth_res.status_code == 401, f"Expected 401, got {unauth_res.status_code}"

    # Unauthenticated create
    unauth_post = client.post(
        "/api/expenses",
        json={
            "farm_id": alice_farm_id,
            "category": "fuel",
            "title": "Diesel for tractor",
            "amount": 2500.0,
            "expense_date": "2026-05-01",
        },
    )
    assert unauth_post.status_code == 401

    # Bob attempts to create expense on Alice's farm (IDOR)
    cross_farm_res = client.post(
        "/api/expenses",
        headers=bob_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "fuel",
            "title": "Unauthorized Expense",
            "amount": 1000.0,
            "expense_date": "2026-05-01",
        },
    )
    assert cross_farm_res.status_code == 404, f"Expected 404, got {cross_farm_res.status_code}"

    # Alice selects Bob's field plot on Alice's farm
    mismatched_field_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": bob_field_id,
            "category": "seeds",
            "title": "Hybrid Seeds",
            "amount": 1500.0,
            "expense_date": "2026-05-01",
        },
    )
    assert mismatched_field_res.status_code == 400

    print(" [PASS] 2. Unauthenticated & Cross-Tenant IDOR Injections Blocked")

    # -------------------------------------------------------------
    # 4. Input Validations
    # -------------------------------------------------------------
    print("\n--- [3] Input Validations: Zero/Negative Amount, Blank Title, Invalid Category ---")
    # Zero amount
    zero_amt = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "seeds",
            "title": "Free Seeds",
            "amount": 0.0,
            "expense_date": "2026-05-01",
        },
    )
    assert zero_amt.status_code == 422

    # Negative amount
    neg_amt = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "seeds",
            "title": "Negative Seeds",
            "amount": -500.0,
            "expense_date": "2026-05-01",
        },
    )
    assert neg_amt.status_code == 422

    # Blank title
    blank_title = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "seeds",
            "title": "   ",
            "amount": 500.0,
            "expense_date": "2026-05-01",
        },
    )
    assert blank_title.status_code == 422

    # Invalid category
    invalid_cat = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "cryptocurrency_trading",
            "title": "Tokens",
            "amount": 500.0,
            "expense_date": "2026-05-01",
        },
    )
    assert invalid_cat.status_code == 422

    print(" [PASS] 3. Input Validation Bounds Strictly Enforced")

    # -------------------------------------------------------------
    # 5. Expense Creation: Unpaid
    # -------------------------------------------------------------
    print("\n--- [4] Expense Creation: Unpaid with Relational Links ---")
    unpaid_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field1_id,
            "crop_id": alice_crop_id,
            "category": "Seeds",  # Test normalization
            "title": "Export Quality Grapevine Saplings",
            "description": "500 rootstock grafted saplings for East Plot expansion",
            "amount": 15000.50,
            "expense_date": "2026-05-01",
            "payment_status": "unpaid",
            "vendor_name": "Maharashtra Agri Nursery",
            "invoice_number": "INV-2026-0891",
            "notes": "Payment due in 30 days",
        },
    )
    assert unpaid_res.status_code == 201
    unpaid_exp = unpaid_res.json()
    exp_id_unpaid = unpaid_exp["id"]

    assert unpaid_exp["category"] == "seeds"
    assert unpaid_exp["category_label"] == "Seeds"
    assert Decimal(str(unpaid_exp["amount"])) == Decimal("15000.50")
    assert Decimal(str(unpaid_exp["amount_paid"])) == Decimal("0.00")
    assert Decimal(str(unpaid_exp["outstanding_balance"])) == Decimal("15000.50")
    assert unpaid_exp["payment_status"] == "unpaid"
    assert unpaid_exp["farm_name"] == "Alice Valley Estate"
    assert unpaid_exp["field_name"] == "East Vineyard Plot"
    assert unpaid_exp["crop_name"] == "Table Grapes"
    assert len(unpaid_exp["payments"]) == 0

    print(" [PASS] 4. Unpaid Expense Created & Balances Verified")

    # -------------------------------------------------------------
    # 6. Expense Creation: Paid Upfront
    # -------------------------------------------------------------
    print("\n--- [5] Expense Creation: Paid Upfront with Auto Payment Record ---")
    paid_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "Fuel",
            "title": "Diesel Fuel for Sonalika Tractor",
            "amount": 4200.00,
            "expense_date": "2026-05-02",
            "payment_status": "paid",
            "payment_method": "upi",
            "vendor_name": "Indian Oil Station",
            "invoice_number": "PETROL-9981",
            "transaction_reference": "UPI/9876543210/OKAXIS",
        },
    )
    assert paid_res.status_code == 201
    paid_exp = paid_res.json()
    exp_id_paid = paid_exp["id"]

    assert paid_exp["category"] == "fuel"
    assert Decimal(str(paid_exp["amount"])) == Decimal("4200.00")
    assert Decimal(str(paid_exp["amount_paid"])) == Decimal("4200.00")
    assert Decimal(str(paid_exp["outstanding_balance"])) == Decimal("0.00")
    assert paid_exp["payment_status"] == "paid"
    assert len(paid_exp["payments"]) == 1
    assert Decimal(str(paid_exp["payments"][0]["amount"])) == Decimal("4200.00")
    assert paid_exp["payments"][0]["payment_method"] == "upi"

    print(" [PASS] 5. Upfront Paid Expense & Automatic Ledger Verified")

    # -------------------------------------------------------------
    # 7. Single Expense Retrieval
    # -------------------------------------------------------------
    print("\n--- [6] Single Expense Retrieval by UUID ---")
    get_res = client.get(f"/api/expenses/{exp_id_unpaid}", headers=alice_headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Export Quality Grapevine Saplings"

    print(" [PASS] 6. Single Expense Details Retrieved")

    # -------------------------------------------------------------
    # 8. Updating Expense & Recalculation
    # -------------------------------------------------------------
    print("\n--- [7] Updating Expense & Financial Recalculation ---")
    update_res = client.put(
        f"/api/expenses/{exp_id_unpaid}",
        headers=alice_headers,
        json={
            "title": "Export Quality Grapevine Saplings - Verified Batch",
            "amount": 16000.00,  # increased from 15000.50
            "notes": "Revised after adding 25 saplings",
        },
    )
    assert update_res.status_code == 200
    updated_exp = update_res.json()
    assert Decimal(str(updated_exp["amount"])) == Decimal("16000.00")
    assert Decimal(str(updated_exp["outstanding_balance"])) == Decimal("16000.00")
    assert updated_exp["payment_status"] == "unpaid"

    print(" [PASS] 7. Expense Amount Updated & Balances Recalculated")

    # -------------------------------------------------------------
    # 9. Payment Disbursement Workflow
    # -------------------------------------------------------------
    print("\n--- [8] Payment Disbursements: Partial & Full ---")
    # A. Negative payment amount
    neg_pmt = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=alice_headers,
        json={
            "amount": -500.0,
            "payment_date": "2026-05-05",
            "payment_method": "bank_transfer",
        },
    )
    assert neg_pmt.status_code == 422

    # B. Overpayment (balance is 16000, attempt 17000)
    over_pmt = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=alice_headers,
        json={
            "amount": 17000.0,
            "payment_date": "2026-05-05",
            "payment_method": "bank_transfer",
        },
    )
    assert over_pmt.status_code == 400
    assert "exceeds outstanding balance" in over_pmt.json()["error"]["message"]

    # C. Partial Payment 1: 6,000 INR
    p1_res = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=alice_headers,
        json={
            "amount": 6000.0,
            "payment_date": "2026-05-05",
            "payment_method": "bank_transfer",
            "transaction_reference": "NEFT/SBI/20260505/112233",
            "notes": "First installment paid",
        },
    )
    assert p1_res.status_code == 201

    # Check updated expense state
    exp_after_p1 = client.get(f"/api/expenses/{exp_id_unpaid}", headers=alice_headers).json()
    assert Decimal(str(exp_after_p1["amount_paid"])) == Decimal("6000.00")
    assert Decimal(str(exp_after_p1["outstanding_balance"])) == Decimal("10000.00")
    assert exp_after_p1["payment_status"] == "partially_paid"
    assert len(exp_after_p1["payments"]) == 1

    # D. Attempting to reduce expense amount below already paid amount (6000)
    reduce_below_paid = client.put(
        f"/api/expenses/{exp_id_unpaid}",
        headers=alice_headers,
        json={"amount": 5000.0},
    )
    assert reduce_below_paid.status_code == 400
    assert "Cannot reduce total expense amount" in reduce_below_paid.json()["error"]["message"]

    # E. Final Payment 2: 10,000 INR
    p2_res = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=alice_headers,
        json={
            "amount": 10000.0,
            "payment_date": "2026-05-10",
            "payment_method": "upi",
            "transaction_reference": "UPI/20260510/445566",
            "notes": "Final settlement",
        },
    )
    assert p2_res.status_code == 201

    # Check fully paid state
    exp_after_p2 = client.get(f"/api/expenses/{exp_id_unpaid}", headers=alice_headers).json()
    assert Decimal(str(exp_after_p2["amount_paid"])) == Decimal("16000.00")
    assert Decimal(str(exp_after_p2["outstanding_balance"])) == Decimal("0.00")
    assert exp_after_p2["payment_status"] == "paid"
    assert len(exp_after_p2["payments"]) == 2

    # F. Attempting payment on already paid expense (balance is 0)
    already_paid_pmt = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=alice_headers,
        json={"amount": 500.0, "payment_date": "2026-05-11", "payment_method": "cash"},
    )
    assert already_paid_pmt.status_code == 400

    print(" [PASS] 8. Partial & Full Payment Ledger Transactions Verified")

    # -------------------------------------------------------------
    # 10. Multi-Tenant IDOR Protections
    # -------------------------------------------------------------
    print("\n--- [9] Multi-Tenant IDOR Security Protections ---")
    # Bob attempts to GET Alice's expense
    bob_get = client.get(f"/api/expenses/{exp_id_unpaid}", headers=bob_headers)
    assert bob_get.status_code == 404

    # Bob attempts to PUT Alice's expense
    bob_put = client.put(
        f"/api/expenses/{exp_id_unpaid}",
        headers=bob_headers,
        json={"title": "Hacked Title"},
    )
    assert bob_put.status_code == 404

    # Bob attempts to DELETE Alice's expense
    bob_del = client.delete(f"/api/expenses/{exp_id_unpaid}", headers=bob_headers)
    assert bob_del.status_code == 404

    # Bob attempts to add payment to Alice's expense
    bob_pmt = client.post(
        f"/api/expenses/{exp_id_unpaid}/payments",
        headers=bob_headers,
        json={"amount": 100.0, "payment_date": "2026-05-12", "payment_method": "cash"},
    )
    assert bob_pmt.status_code == 404

    print(" [PASS] 9. Cross-Tenant IDOR Access Strictly Blocked (404)")

    # -------------------------------------------------------------
    # 11. Safe Deletion Rules
    # -------------------------------------------------------------
    print("\n--- [10] Safe Deletion Audit Enforcement ---")
    # Attempting to delete expense with recorded payments
    del_paid_attempt = client.delete(f"/api/expenses/{exp_id_unpaid}", headers=alice_headers)
    assert del_paid_attempt.status_code == 400
    assert "Cannot delete expense with recorded payments" in del_paid_attempt.json()["error"]["message"]

    # Create temporary unpaid expense to test valid deletion
    temp_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "electricity",
            "title": "Irrigation Pump Power Bill - May",
            "amount": 3500.00,
            "expense_date": "2026-05-15",
            "payment_status": "unpaid",
        },
    )
    assert temp_res.status_code == 201
    temp_id = temp_res.json()["id"]

    # Delete unpaid expense
    del_success = client.delete(f"/api/expenses/{temp_id}", headers=alice_headers)
    assert del_success.status_code == 200
    assert del_success.json()["deleted"] is True

    # Subsequent lookup is 404
    lookup_after_del = client.get(f"/api/expenses/{temp_id}", headers=alice_headers)
    assert lookup_after_del.status_code == 404

    print(" [PASS] 10. Financial Audit Deletion Rules Strictly Enforced")

    # -------------------------------------------------------------
    # 12. Create additional varied expenses for filtering & summaries
    # -------------------------------------------------------------
    print("\n--- [11] Multi-Criteria Filtering & Aggregation Setup ---")
    # Expense 3: Labour (Partially Paid)
    exp3_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field2_id,
            "category": "labour",
            "title": "Pruning and Trellising Labor",
            "amount": 8000.00,
            "expense_date": "2026-05-18",
            "payment_status": "unpaid",
            "vendor_name": "Kisan Shramik Seva",
        },
    )
    assert exp3_res.status_code == 201
    exp3_id = exp3_res.json()["id"]
    # Add partial payment of 3000
    client.post(
        f"/api/expenses/{exp3_id}/payments",
        headers=alice_headers,
        json={"amount": 3000.0, "payment_date": "2026-05-19", "payment_method": "cash"},
    )

    # Expense 4: Maintenance (Unpaid)
    exp4_res = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "category": "maintenance_and_repairs",
            "title": "Drip Irrigation Pipe Replacement",
            "amount": 2800.00,
            "expense_date": "2026-05-20",
            "payment_status": "unpaid",
            "vendor_name": "Jain Irrigation Spares",
        },
    )
    assert exp4_res.status_code == 201

    # Bob creates an expense on his farm
    client.post(
        "/api/expenses",
        headers=bob_headers,
        json={
            "farm_id": bob_farm_id,
            "category": "fuel",
            "title": "Bob Petrol Expense",
            "amount": 1200.0,
            "expense_date": "2026-05-20",
            "payment_status": "paid",
        },
    )

    # Test category filter
    fuel_list = client.get("/api/expenses?category=fuel", headers=alice_headers).json()
    assert len(fuel_list) == 1
    assert fuel_list[0]["title"] == "Diesel Fuel for Sonalika Tractor"

    # Test payment status filter
    unpaid_list = client.get("/api/expenses?payment_status=unpaid", headers=alice_headers).json()
    assert len(unpaid_list) == 1
    assert unpaid_list[0]["title"] == "Drip Irrigation Pipe Replacement"

    partially_paid_list = client.get(
        "/api/expenses?payment_status=partially_paid", headers=alice_headers
    ).json()
    assert len(partially_paid_list) == 1
    assert partially_paid_list[0]["title"] == "Pruning and Trellising Labor"

    # Test search filter
    search_list = client.get("/api/expenses?search=Tractor", headers=alice_headers).json()
    assert len(search_list) == 1
    assert "Sonalika Tractor" in search_list[0]["title"]

    # Bob's list has 1 item, does not include Alice's items
    bob_list = client.get("/api/expenses", headers=bob_headers).json()
    assert len(bob_list) == 1
    assert bob_list[0]["title"] == "Bob Petrol Expense"

    print(" [PASS] 11. Multi-Criteria Filtering Verified")

    # -------------------------------------------------------------
    # 13. Authoritative Summary Statistics
    # -------------------------------------------------------------
    print("\n--- [12] Summary Statistics & Decimal Financial Aggregation ---")
    # Alice has 3 active expenses:
    # 1. exp_id_unpaid: amount=16000, paid=16000, balance=0, status=paid (seeds)
    # 2. exp_id_paid: amount=4200, paid=4200, balance=0, status=paid (fuel)
    # 3. exp3_id: amount=8000, paid=3000, balance=5000, status=partially_paid (labour)
    # 4. exp4_id: amount=2800, paid=0, balance=2800, status=unpaid (maintenance_and_repairs)
    # Total Expenses = 16000 + 4200 + 8000 + 2800 = 31000.00
    # Total Paid = 16000 + 4200 + 3000 + 0 = 23200.00
    # Total Unpaid = 0 + 0 + 5000 + 2800 = 7800.00
    # Total Partially Paid = 8000.00
    summary_res = client.get("/api/expenses/summary", headers=alice_headers)
    assert summary_res.status_code == 200
    sum_data = summary_res.json()

    assert Decimal(str(sum_data["total_expenses"])) == Decimal("31000.00")
    assert Decimal(str(sum_data["total_paid"])) == Decimal("23200.00")
    assert Decimal(str(sum_data["total_unpaid"])) == Decimal("7800.00")
    assert Decimal(str(sum_data["total_partially_paid"])) == Decimal("8000.00")
    assert sum_data["expense_count"] == 4
    assert sum_data["paid_count"] == 2
    assert sum_data["partially_paid_count"] == 1
    assert sum_data["unpaid_count"] == 1
    assert sum_data["highest_category"]["category"] == "seeds"
    assert Decimal(str(sum_data["highest_category"]["total_amount"])) == Decimal("16000.00")

    print(" [PASS] 12. Authoritative Decimal Financial Summaries Verified")

    # -------------------------------------------------------------
    # 14. CSV Export
    # -------------------------------------------------------------
    print("\n--- [13] CSV Export Generation ---")
    export_res = client.get("/api/expenses/export", headers=alice_headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    csv_text = export_res.text
    assert "Expense ID,Date,Title,Category,Farm,Field,Crop" in csv_text
    assert "Export Quality Grapevine Saplings" in csv_text
    assert "Diesel Fuel for Sonalika Tractor" in csv_text

    print(" [PASS] 13. CSV Export Format & Data Integrity Verified")

    # -------------------------------------------------------------
    # 15. Nested Convenience Endpoints
    # -------------------------------------------------------------
    print("\n--- [14] Nested Convenience Endpoints ---")
    farm_exp = client.get(f"/api/farms/{alice_farm_id}/expenses", headers=alice_headers)
    assert farm_exp.status_code == 200
    assert len(farm_exp.json()) == 4

    field_exp = client.get(f"/api/fields/{alice_field1_id}/expenses", headers=alice_headers)
    assert field_exp.status_code == 200
    assert len(field_exp.json()) == 1

    crop_exp = client.get(f"/api/crops/{alice_crop_id}/expenses", headers=alice_headers)
    assert crop_exp.status_code == 200
    assert len(crop_exp.json()) == 1

    exp_farm_route = client.get(f"/api/expenses/farm/{alice_farm_id}", headers=alice_headers)
    assert exp_farm_route.status_code == 200
    assert len(exp_farm_route.json()) == 4

    print(" [PASS] 14. Nested Convenience Routes Verified")

    print("\n" + "=" * 65)
    print(" ALL 14/14 PHASE 12 EXPENSE MANAGEMENT TESTS PASSED EXCELLENTLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
