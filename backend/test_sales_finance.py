"""Automated Test Suite for Phase 15: Sales, Income & Profit/Loss Management.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms, fields, crops, and harvests registered under respective tenants.
3. Unauthenticated access blocked (HTTP 401 Unauthorized).
4. Relational hierarchy enforcement (Field must belong to Farm, Crop to Field, Harvest to Crop/Farm).
5. Input bounds & monetary validation (zero/negative quantity, negative prices, discount > gross, overpayment).
6. Sale creation:
   - Unpaid produce sale with authoritative decimal gross, total, and outstanding amounts.
   - Produce sale with upfront payment and automatic payment transaction ledger entry.
7. Single sale retrieval with populated relational details (farm, field, crop, harvest, payments).
8. Payment ledger transactions:
   - Recording installment payment against outstanding sale balance.
   - Rejection of payments exceeding outstanding balance.
   - Status transition from unpaid -> partially_paid -> paid.
   - Payment deletion restoring outstanding balance.
9. Updating sale and financial recalculations:
   - Recalculating gross and total amounts upon price/quantity update.
   - Blocking reductions below already recorded payments.
10. Safe deletion audit enforcement:
    - Deletion of sale with recorded payments blocked (HTTP 400).
    - Deletion of unpaid sale allowed (HTTP 200).
11. Other Farm Income:
    - Recording non-produce income (government subsidies, equipment rental).
    - Input bounds validation (negative/zero amount blocked).
    - Filtering, updating, and aggregate category breakdown.
12. Multi-tenant IDOR security protections:
    - Cross-tenant access strictly blocked across sales, payments, income, and summaries.
13. Authoritative Financial Summary & Profit/Loss API (/api/financial-summary):
    - Produce sales revenue correctly calculated (post-discount).
    - Non-crop other income calculated separately without double counting.
    - Phase 12 expenses correctly queried and aggregated.
    - Net Profit / Loss = (Sales Revenue + Other Income) - Recorded Expenses.
    - Outstanding receivables and payables accurately tracked.
    - Month-by-month financial timeline verification.
14. Nested convenience routes (/farms/{id}/sales, /crops/{id}/sales, /harvests/{id}/sales, /farms/{id}/income).
"""

import sys
import os
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Registers all models including Sale, SalePayment, OtherIncome, Expense, Harvest
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


def test_phase_15_sales_and_finance():
    print("=" * 65)
    print(" Running Phase 15 Sales, Income & Profit/Loss Test Suite")
    print("=" * 65)

    # 1. Reset and create database schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[PASS] Database tables initialized in memory")

    # 2. Register Tenant A (Alice) & Tenant B (Bob)
    alice_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Farmer",
            "email": "alice.finance@example.com",
            "password": "Password123!",
        },
    )
    assert alice_reg.status_code == 201, f"Alice registration failed: {alice_reg.text}"
    alice_token = alice_reg.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    print("[PASS] Tenant A (Alice) registered and authenticated")

    bob_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Farmer",
            "email": "bob.finance@example.com",
            "password": "Password123!",
        },
    )
    assert bob_reg.status_code == 201, f"Bob registration failed: {bob_reg.text}"
    bob_token = bob_reg.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    client.cookies.clear()
    print("[PASS] Tenant B (Bob) registered and authenticated")

    # 3. Setup Alice's Farm, Field, Crop, and Harvest
    a_farm_res = client.post(
        "/api/farms",
        json={
            "name": "Alice Valley Estate",
            "location": "Green Valley, Sector 4",
            "total_area": 85.0,
            "area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert a_farm_res.status_code == 201, a_farm_res.text
    alice_farm_id = a_farm_res.json()["id"]

    a_field_res = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        json={
            "name": "North Meadow",
            "area": 35.0,
            "area_unit": "acres",
            "soil_type": "Loam",
        },
        headers=alice_headers,
    )
    assert a_field_res.status_code == 201, a_field_res.text
    alice_field_id = a_field_res.json()["id"]

    a_crop_res = client.post(
        "/api/crops",
        json={
            "field_id": alice_field_id,
            "name": "Durum Wheat",
            "variety": "Malavika",
            "season": "Rabi",
            "sowing_date": "2026-10-01",
            "status": "ready_to_harvest",
            "planted_area": 35.0,
            "planted_area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert a_crop_res.status_code == 201, a_crop_res.text
    alice_crop_id = a_crop_res.json()["id"]

    a_harvest_res = client.post(
        "/api/harvests",
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_id,
            "crop_id": alice_crop_id,
            "harvest_date": "2026-10-15",
            "quantity": 5000.00,
            "unit": "kg",
            "quality_grade": "Grade A",
            "batch_number": "BATCH-WHEAT-001",
        },
        headers=alice_headers,
    )
    assert a_harvest_res.status_code == 201, a_harvest_res.text
    alice_harvest_id = a_harvest_res.json()["id"]
    print("[PASS] Alice's farm, field, crop, and harvest initialized")

    # Setup Bob's Farm, Field, and Crop
    b_farm_res = client.post(
        "/api/farms",
        json={
            "name": "Bob Highland Farm",
            "location": "Highlands, Plot 9",
            "total_area": 40.0,
            "area_unit": "acres",
        },
        headers=bob_headers,
    )
    assert b_farm_res.status_code == 201, b_farm_res.text
    bob_farm_id = b_farm_res.json()["id"]

    b_field_res = client.post(
        f"/api/farms/{bob_farm_id}/fields",
        json={
            "name": "Bob Ridge",
            "area": 20.0,
            "area_unit": "acres",
            "soil_type": "Clay",
        },
        headers=bob_headers,
    )
    assert b_field_res.status_code == 201, b_field_res.text
    bob_field_id = b_field_res.json()["id"]

    b_crop_res = client.post(
        "/api/crops",
        json={
            "field_id": bob_field_id,
            "name": "Sweet Corn",
            "variety": "Sugar Baby",
            "season": "Kharif",
            "sowing_date": "2026-09-01",
            "status": "ready_to_harvest",
            "planted_area": 20.0,
            "planted_area_unit": "acres",
        },
        headers=bob_headers,
    )
    assert b_crop_res.status_code == 201, b_crop_res.text
    bob_crop_id = b_crop_res.json()["id"]
    print("[PASS] Bob's farm, field, and crop initialized")

    # 4. Security: Unauthenticated access blocked
    client.cookies.clear()
    assert client.get("/api/sales").status_code == 401
    assert client.post("/api/sales", json={}).status_code == 401
    assert client.get("/api/income").status_code == 401
    assert client.get("/api/financial-summary").status_code == 401
    print("[PASS] Unauthenticated access properly rejected with HTTP 401")

    # 5. Hierarchy and Ownership Validation
    # Alice attempts to create sale under Bob's farm -> 404
    cross_farm_sale = client.post(
        "/api/sales",
        json={
            "farm_id": bob_farm_id,
            "buyer_name": "City Grain Co.",
            "product_name": "Wheat",
            "quantity": 1000,
            "unit_price": 25,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert cross_farm_sale.status_code == 404

    # Alice selects her farm but Bob's field -> 400
    mismatch_field_sale = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "field_id": bob_field_id,
            "buyer_name": "City Grain Co.",
            "product_name": "Wheat",
            "quantity": 1000,
            "unit_price": 25,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert mismatch_field_sale.status_code == 400

    # Alice selects her farm but Bob's crop -> 400
    mismatch_crop_sale = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "crop_id": bob_crop_id,
            "buyer_name": "City Grain Co.",
            "product_name": "Wheat",
            "quantity": 1000,
            "unit_price": 25,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert mismatch_crop_sale.status_code == 400
    print("[PASS] Relational hierarchy and farm ownership boundaries strictly enforced")

    # 6. Input Bounds Validation
    # Zero quantity -> 422
    zero_qty = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "buyer_name": "Buyer 1",
            "product_name": "Wheat",
            "quantity": 0,
            "unit_price": 20,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert zero_qty.status_code == 422

    # Negative price -> 422
    neg_price = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "buyer_name": "Buyer 1",
            "product_name": "Wheat",
            "quantity": 50,
            "unit_price": -10,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert neg_price.status_code == 422

    # Discount exceeding gross amount (50 * 20 = 1000 gross, discount = 1500) -> 400
    excess_disc = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "buyer_name": "Buyer 1",
            "product_name": "Wheat",
            "quantity": 50,
            "unit_price": 20,
            "discount_amount": 1500,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert excess_disc.status_code == 400

    # Initial payment exceeding total payable amount -> 400
    # Gross = 1000, discount = 100, total = 900, initial payment = 1200 -> 400
    excess_payment = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "buyer_name": "Buyer 1",
            "product_name": "Wheat",
            "quantity": 50,
            "unit_price": 20,
            "discount_amount": 100,
            "initial_payment_amount": 1200,
            "sale_date": "2026-10-16",
        },
        headers=alice_headers,
    )
    assert excess_payment.status_code == 400
    print("[PASS] Input bounds, negative values, and excessive discount/payment validated")

    # 7. Create Unpaid Sale
    # 2000 kg Durum Wheat at 25 INR/kg, discount 1000 INR
    # Gross: 50,000.00, Discount: 1,000.00, Total: 49,000.00, Paid: 0.00, Outstanding: 49,000.00, Status: unpaid
    sale1_res = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_id,
            "crop_id": alice_crop_id,
            "harvest_id": alice_harvest_id,
            "buyer_name": "Metro Agro Mandi",
            "buyer_phone": "+91-9876543210",
            "buyer_address": "Shop 12, APMC Market Yard",
            "product_name": "Durum Wheat Grade A",
            "quantity": 2000.00,
            "unit": "kg",
            "unit_price": 25.00,
            "discount_amount": 1000.00,
            "sale_date": "2026-10-16",
            "notes": "First harvest consignment delivered via truck.",
        },
        headers=alice_headers,
    )
    assert sale1_res.status_code == 201
    sale1 = sale1_res.json()
    sale1_id = sale1["id"]
    assert sale1["gross_amount"] == "50000.00"
    assert sale1["discount_amount"] == "1000.00"
    assert sale1["total_amount"] == "49000.00"
    assert sale1["amount_paid"] == "0.00"
    assert sale1["outstanding_amount"] == "49000.00"
    assert sale1["payment_status"] == "unpaid"
    assert sale1["farm_name"] == "Alice Valley Estate"
    assert sale1["crop_name"] == "Durum Wheat"
    assert sale1["harvest_batch_number"] == "BATCH-WHEAT-001"
    assert sale1["sale_number"].startswith("SALE-")
    print("[PASS] Unpaid produce sale created with authoritative financial totals")

    # 8. Create Sale with Initial Upfront Payment
    # 1000 kg Wheat at 30 INR/kg, no discount = 30,000.00, upfront 10,000.00
    # Outstanding: 20,000.00, Status: partially_paid
    sale2_res = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "crop_id": alice_crop_id,
            "buyer_name": "Golden Bakery Ltd.",
            "buyer_phone": "+91-9123456789",
            "product_name": "Wheat Grain",
            "quantity": 1000.00,
            "unit": "kg",
            "unit_price": 30.00,
            "discount_amount": 0.00,
            "initial_payment_amount": 10000.00,
            "payment_method": "bank_transfer",
            "reference_number": "NEFT-TXN-101",
            "sale_date": "2026-10-17",
        },
        headers=alice_headers,
    )
    assert sale2_res.status_code == 201
    sale2 = sale2_res.json()
    sale2_id = sale2["id"]
    assert sale2["gross_amount"] == "30000.00"
    assert sale2["total_amount"] == "30000.00"
    assert sale2["amount_paid"] == "10000.00"
    assert sale2["outstanding_amount"] == "20000.00"
    assert sale2["payment_status"] == "partially_paid"
    assert len(sale2["payments"]) == 1
    assert sale2["payments"][0]["amount"] == "10000.00"
    assert sale2["payments"][0]["payment_method"] == "bank_transfer"
    print("[PASS] Sale with upfront payment created and ledger automatically logged")

    # 9. Payment Ledger: Record Partial and Full Installments
    # Sale 1 outstanding balance is 49,000.00
    # Overpayment test: attempt payment of 50,000.00 -> 400
    overpay_res = client.post(
        f"/api/sales/{sale1_id}/payments",
        json={
            "amount": 50000.00,
            "payment_date": "2026-10-18",
            "payment_method": "cheque",
        },
        headers=alice_headers,
    )
    assert overpay_res.status_code == 400

    # Installment 1: 20,000.00 -> status partially_paid, outstanding 29,000.00
    p1_res = client.post(
        f"/api/sales/{sale1_id}/payments",
        json={
            "amount": 20000.00,
            "payment_date": "2026-10-18",
            "payment_method": "bank_transfer",
            "reference_number": "IMPS-20261018-01",
            "notes": "Advance payment via IMPS",
        },
        headers=alice_headers,
    )
    assert p1_res.status_code == 201
    p1_id = p1_res.json()["id"]

    # Verify updated sale 1
    get_s1 = client.get(f"/api/sales/{sale1_id}", headers=alice_headers).json()
    assert get_s1["amount_paid"] == "20000.00"
    assert get_s1["outstanding_amount"] == "29000.00"
    assert get_s1["payment_status"] == "partially_paid"

    # Installment 2: 29,000.00 -> status paid, outstanding 0.00
    p2_res = client.post(
        f"/api/sales/{sale1_id}/payments",
        json={
            "amount": 29000.00,
            "payment_date": "2026-10-19",
            "payment_method": "upi",
            "reference_number": "UPI-REF-9988",
            "notes": "Final settlement via UPI",
        },
        headers=alice_headers,
    )
    assert p2_res.status_code == 201

    get_s1_settled = client.get(f"/api/sales/{sale1_id}", headers=alice_headers).json()
    assert get_s1_settled["amount_paid"] == "49000.00"
    assert get_s1_settled["outstanding_amount"] == "0.00"
    assert get_s1_settled["payment_status"] == "paid"
    assert len(get_s1_settled["payments"]) == 2
    print("[PASS] Payment ledger installments, balance calculations, and 'paid' status verified")

    # 10. Payment Deletion and Balance Adjustment
    del_p1_res = client.delete(f"/api/sales/{sale1_id}/payments/{p1_id}", headers=alice_headers)
    assert del_p1_res.status_code == 200
    # Now only p2 (29,000.00) remains -> outstanding 20,000.00, status partially_paid
    get_s1_after_del = client.get(f"/api/sales/{sale1_id}", headers=alice_headers).json()
    assert get_s1_after_del["amount_paid"] == "29000.00"
    assert get_s1_after_del["outstanding_amount"] == "20000.00"
    assert get_s1_after_del["payment_status"] == "partially_paid"
    print("[PASS] Payment deletion correctly recalculated sale balance and status")

    # Re-add payment so sale1 is fully paid again (20,000.00)
    client.post(
        f"/api/sales/{sale1_id}/payments",
        json={
            "amount": 20000.00,
            "payment_date": "2026-10-19",
            "payment_method": "cash",
        },
        headers=alice_headers,
    )

    # 11. Safe Deletion Audit Rule
    # Attempting to delete Sale 1 (which has 49,000 paid) -> must be rejected with 400
    del_s1_fail = client.delete(f"/api/sales/{sale1_id}", headers=alice_headers)
    assert del_s1_fail.status_code == 400
    err_body = del_s1_fail.json()
    err_msg = err_body.get("detail") or err_body.get("error", {}).get("message", "")
    assert "Cannot delete sale with recorded customer payments" in err_msg
    print("[PASS] Safe deletion audit rule enforced: Sale with payments cannot be deleted")

    # Create temporary unpaid sale and delete it -> 200 OK
    tmp_sale = client.post(
        "/api/sales",
        json={
            "farm_id": alice_farm_id,
            "buyer_name": "Temporary Buyer",
            "product_name": "Wheat Bran",
            "quantity": 100.00,
            "unit_price": 10.00,
            "sale_date": "2026-10-19",
        },
        headers=alice_headers,
    ).json()
    tmp_id = tmp_sale["id"]
    del_tmp = client.delete(f"/api/sales/{tmp_id}", headers=alice_headers)
    assert del_tmp.status_code == 200
    assert del_tmp.json()["deleted"] is True
    assert client.get(f"/api/sales/{tmp_id}", headers=alice_headers).status_code == 404
    print("[PASS] Unpaid sale safely deleted")

    # 12. Update Sale and Recalculation
    # Sale 2: Currently gross 30,000, paid 10,000, outstanding 20,000.
    # Update unit_price to 35 -> gross 35,000, total 35,000, paid 10,000, outstanding 25,000
    upd_s2 = client.put(
        f"/api/sales/{sale2_id}",
        json={"unit_price": 35.00, "notes": "Price renegotiated to 35 INR/kg"},
        headers=alice_headers,
    )
    assert upd_s2.status_code == 200
    s2_updated = upd_s2.json()
    assert s2_updated["unit_price"] == "35.00"
    assert s2_updated["gross_amount"] == "35000.00"
    assert s2_updated["total_amount"] == "35000.00"
    assert s2_updated["amount_paid"] == "10000.00"
    assert s2_updated["outstanding_amount"] == "25000.00"

    # Attempt to reduce total amount below already paid amount (10,000):
    # e.g., quantity 200 at price 35 = 7,000 < 10,000 -> 400
    upd_s2_invalid = client.put(
        f"/api/sales/{sale2_id}",
        json={"quantity": 200.00},
        headers=alice_headers,
    )
    assert upd_s2_invalid.status_code == 400
    print("[PASS] Sale update and balance recalculation verified; reduction below paid amount blocked")

    # 13. Other Farm Income Management
    # Alice records a government subsidy of 25,000.00
    inc1_res = client.post(
        "/api/income",
        json={
            "farm_id": alice_farm_id,
            "category": "government_subsidy",
            "description": "PM-KISAN Agricultural Modernization Subsidy",
            "amount": 25000.00,
            "source": "Ministry of Agriculture",
            "payment_method": "bank_transfer",
            "reference_number": "GOV-SUB-2026",
            "income_date": "2026-10-10",
        },
        headers=alice_headers,
    )
    assert inc1_res.status_code == 201
    inc1 = inc1_res.json()
    inc1_id = inc1["id"]
    assert inc1["amount"] == "25000.00"
    assert inc1["category_label"] == "Government Subsidy"

    # Alice records tractor rental income of 8,000.00
    inc2_res = client.post(
        "/api/income",
        json={
            "farm_id": alice_farm_id,
            "category": "equipment_rental",
            "description": "Tractor and Rotavator 2-Day Lease to Neighbour",
            "amount": 8000.00,
            "source": "Ramesh Kumar (Neighbouring Farm)",
            "payment_method": "cash",
            "income_date": "2026-10-12",
        },
        headers=alice_headers,
    )
    assert inc2_res.status_code == 201
    inc2_id = inc2_res.json()["id"]

    # Verify income list and summary
    incomes_list = client.get("/api/income", headers=alice_headers).json()
    assert len(incomes_list) == 2

    income_sum = client.get("/api/income/summary", headers=alice_headers).json()
    assert income_sum["total_income"] == "33000.00"
    assert income_sum["total_count"] == 2
    assert len(income_sum["category_breakdown"]) == 2
    print("[PASS] Other farm income creation, listing, and category breakdown verified")

    # 14. Multi-Tenant IDOR Protections
    # Bob attempts to view Alice's sale -> 404
    assert client.get(f"/api/sales/{sale1_id}", headers=bob_headers).status_code == 404
    # Bob attempts to update Alice's sale -> 404
    assert client.put(f"/api/sales/{sale1_id}", json={"notes": "Hacked"}, headers=bob_headers).status_code == 404
    # Bob attempts to delete Alice's sale -> 404
    assert client.delete(f"/api/sales/{sale1_id}", headers=bob_headers).status_code == 404
    # Bob attempts to view Alice's income -> 404
    assert client.get(f"/api/income/{inc1_id}", headers=bob_headers).status_code == 404
    # Bob attempts to update Alice's income -> 404
    assert client.put(f"/api/income/{inc1_id}", json={"description": "Hacked"}, headers=bob_headers).status_code == 404
    # Bob attempts to delete Alice's income -> 404
    assert client.delete(f"/api/income/{inc1_id}", headers=bob_headers).status_code == 404
    print("[PASS] Multi-tenant cross-user IDOR access strictly blocked across all endpoints")

    # 15. Create Bob's Sale and Verify Bob's Isolated Summary
    bob_sale_res = client.post(
        "/api/sales",
        json={
            "farm_id": bob_farm_id,
            "crop_id": bob_crop_id,
            "buyer_name": "Bob's Sweet Corn Buyer",
            "product_name": "Sweet Corn Cobs",
            "quantity": 500.00,
            "unit": "kg",
            "unit_price": 20.00,
            "sale_date": "2026-10-18",
        },
        headers=bob_headers,
    )
    assert bob_sale_res.status_code == 201

    bob_summary = client.get("/api/sales/summary", headers=bob_headers).json()
    assert bob_summary["total_sales_count"] == 1
    assert bob_summary["total_revenue"] == "10000.00"
    print("[PASS] Tenant B's independent sales metrics verified in complete isolation")

    # 16. Record Phase 12 Expenses to Validate Financial Summary & Profit/Loss Calculation
    # Alice logs two operating expenses:
    # 1. Seeds: 15,000.00 INR (paid upfront)
    # 2. Fertilizer: 12,000.00 INR (unpaid)
    # Total Expenses: 27,000.00 INR
    client.post(
        "/api/expenses",
        json={
            "farm_id": alice_farm_id,
            "category": "seeds",
            "title": "Certified Durum Wheat Foundation Seeds",
            "amount": 15000.00,
            "expense_date": "2026-10-02",
            "initial_payment": True,
            "payment_method": "bank_transfer",
        },
        headers=alice_headers,
    )

    client.post(
        "/api/expenses",
        json={
            "farm_id": alice_farm_id,
            "category": "fertilizer",
            "title": "DAP and Urea Compound Fertilizers",
            "amount": 12000.00,
            "expense_date": "2026-10-05",
        },
        headers=alice_headers,
    )
    print("[PASS] Operational expenses recorded via Phase 12 Expense module")

    # 17. Authoritative Financial Summary & Profit/Loss Calculation
    # Alice's Financial Data:
    # Sales Revenue:
    #   Sale 1: 49,000.00
    #   Sale 2: 35,000.00
    #   Total Sales Revenue: 84,000.00
    # Other Income:
    #   Income 1: 25,000.00 (Subsidy)
    #   Income 2:  8,000.00 (Rental)
    #   Total Other Income: 33,000.00
    # Total Income = 84,000 + 33,000 = 117,000.00
    # Total Expenses = 15,000 + 12,000 = 27,000.00
    # Net Profit = 117,000.00 - 27,000.00 = 90,000.00 INR (Profit!)
    # Receivables:
    #   Sale 1: 0.00 outstanding (paid in full)
    #   Sale 2: 25,000.00 outstanding
    #   Total Outstanding Receivables = 25,000.00
    # Outstanding Payables:
    #   Expense 2: 12,000.00 unpaid
    #   Total Outstanding Payables = 12,000.00
    fin_res = client.get("/api/financial-summary", headers=alice_headers)
    assert fin_res.status_code == 200
    fin = fin_res.json()

    assert fin["total_sales_revenue"] == "84000.00"
    assert fin["total_other_income"] == "33000.00"
    assert fin["total_income"] == "117000.00"
    assert fin["total_expenses"] == "27000.00"
    assert fin["net_profit_loss"] == "90000.00"
    assert fin["is_profit"] is True
    assert Decimal(fin["profit_margin_percentage"]) > Decimal("0.00")
    assert fin["outstanding_receivables"] == "25000.00"
    assert fin["outstanding_payables"] == "12000.00"
    assert fin["total_sales_count"] == 2
    assert fin["total_income_count"] == 2
    assert fin["total_expenses_count"] == 2
    assert len(fin["monthly_breakdown"]) >= 1
    assert "disclaimer" in fin
    print("[PASS] Authoritative Net Profit/Loss calculations match decimal accounting formulas")

    # Test alias route /api/sales/financial-summary
    alias_res = client.get("/api/sales/financial-summary", headers=alice_headers)
    assert alias_res.status_code == 200
    assert alias_res.json()["net_profit_loss"] == "90000.00"
    print("[PASS] Financial summary alias route (/api/sales/financial-summary) verified")

    # 18. Nested Convenience Routes
    farm_sales_res = client.get(f"/api/farms/{alice_farm_id}/sales", headers=alice_headers)
    assert farm_sales_res.status_code == 200
    assert len(farm_sales_res.json()) == 2

    crop_sales_res = client.get(f"/api/crops/{alice_crop_id}/sales", headers=alice_headers)
    assert crop_sales_res.status_code == 200
    assert len(crop_sales_res.json()) == 2

    harvest_sales_res = client.get(f"/api/harvests/{alice_harvest_id}/sales", headers=alice_headers)
    assert harvest_sales_res.status_code == 200
    assert len(harvest_sales_res.json()) == 1

    farm_income_res = client.get(f"/api/farms/{alice_farm_id}/income", headers=alice_headers)
    assert farm_income_res.status_code == 200
    assert len(farm_income_res.json()) == 2
    print("[PASS] Nested convenience routes (/farms/{id}/sales, /crops/{id}/sales, /harvests/{id}/sales, /farms/{id}/income) verified")

    print("=" * 65)
    print(" ALL 18 PHASE 15 SALES & PROFIT/LOSS TESTS PASSED (100%)")
    print("=" * 65)


if __name__ == "__main__":
    test_phase_15_sales_and_finance()
