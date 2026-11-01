"""Script to seed realistic demo data into SQLite database for live visualization."""

import os
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

# Point to SQLite database
os.environ["DATABASE_URL"] = "sqlite:///./farm.db"

from app.database.connection import engine, SessionLocal
from app.database.base import Base
from app.core.security import hash_password
import app.models
from app.models.user import User
from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.models.salary import SalaryRecord, SalaryPayment
from app.models.application import AgriculturalApplication
from app.models.expense import Expense, ExpensePayment
from app.models.harvest import Harvest
from app.models.sale import Sale, SalePayment
from app.models.income import OtherIncome
from app.models.calendar import FarmCalendarEvent

def seed():
    print("Creating all tables in SQLite farm.db...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data if any
    try:
        db.query(FarmCalendarEvent).delete()
        db.query(OtherIncome).delete()
        db.query(SalePayment).delete()
        db.query(Sale).delete()
        db.query(Harvest).delete()
        db.query(ExpensePayment).delete()
        db.query(Expense).delete()
        db.query(AgriculturalApplication).delete()
        db.query(SalaryPayment).delete()
        db.query(SalaryRecord).delete()
        db.query(Attendance).delete()
        db.query(Labour).delete()
        db.query(Crop).delete()
        db.query(Field).delete()
        db.query(Farm).delete()
        db.query(User).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning during cleanup: {e}")

    # 1. Create Demo User
    user = User(
        id=uuid.uuid4(),
        email="farmer@agricore.com",
        name="Rajesh Patel",
        phone="+91 98765 43210",
        password_hash=hash_password("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created demo user: {user.email}")

    # 2. Create Farms
    farm1 = Farm(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Green Valley Organic Estate",
        location="Nashik, Maharashtra",
        total_area=Decimal("35.50"),
        area_unit="Acres",
    )
    farm2 = Farm(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Sunrise Alphonso Orchards",
        location="Ratnagiri, Maharashtra",
        total_area=Decimal("50.00"),
        area_unit="Acres",
    )
    db.add_all([farm1, farm2])
    db.commit()

    # 3. Create Fields
    field1 = Field(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        name="North Terrace Plot A",
        area=Decimal("12.50"),
        area_unit="Acres",
        soil_type="Red Loamy",
        irrigation_type="Drip Irrigation",
        description="High-fertility plot with precision drip irrigation.",
    )
    field2 = Field(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        name="South Valley Plot B",
        area=Decimal("18.00"),
        area_unit="Acres",
        soil_type="Black Clay",
        irrigation_type="Sprinkler Irrigation",
        description="Well-drained valley parcel optimal for rotation crops.",
    )
    field3 = Field(
        id=uuid.uuid4(),
        farm_id=farm2.id,
        name="Alphonso Hilltop Block",
        area=Decimal("30.00"),
        area_unit="Acres",
        soil_type="Laterite",
        irrigation_type="Drip Irrigation",
        description="Mature 15-year-old fruit orchard block.",
    )
    db.add_all([field1, field2, field3])
    db.commit()

    # 4. Create Crops
    crop1 = Crop(
        id=uuid.uuid4(),
        field_id=field1.id,
        name="Soybean",
        variety="JS 335 Organic",
        season="Kharif",
        sowing_date=date(2026, 6, 15),
        expected_harvest_date=date(2026, 10, 25),
        planted_area=Decimal("12.00"),
        status="growing",
    )
    crop2 = Crop(
        id=uuid.uuid4(),
        field_id=field2.id,
        name="Sweet Corn",
        variety="Sugar 75 Hybrid",
        season="Kharif",
        sowing_date=date(2026, 7, 1),
        expected_harvest_date=date(2026, 11, 10),
        planted_area=Decimal("15.00"),
        status="growing",
    )
    crop3 = Crop(
        id=uuid.uuid4(),
        field_id=field3.id,
        name="Alphonso Mango",
        variety="Ratnagiri Alphonso GI",
        season="Annual",
        sowing_date=date(2012, 3, 10),
        expected_harvest_date=date(2027, 4, 30),
        planted_area=Decimal("28.00"),
        status="growing",
    )
    db.add_all([crop1, crop2, crop3])
    db.commit()

    # 5. Create Labour
    l1 = Labour(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        name="Ramesh Kumar",
        phone="9823456781",
        work_type="Harvester",
        daily_wage=Decimal("450.00"),
        joining_date=date(2025, 1, 15),
        status="active",
    )
    l2 = Labour(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        name="Sunita Bai",
        phone="9823456782",
        work_type="Planter",
        daily_wage=Decimal("400.00"),
        joining_date=date(2025, 2, 1),
        status="active",
    )
    l3 = Labour(
        id=uuid.uuid4(),
        farm_id=farm2.id,
        name="Vijay Shinde",
        phone="9823456783",
        work_type="Machinery Operator",
        daily_wage=Decimal("550.00"),
        joining_date=date(2024, 11, 10),
        status="active",
    )
    db.add_all([l1, l2, l3])
    db.commit()

    # 6. Create Agricultural Applications (Fertilizers & Pesticides)
    app1 = AgriculturalApplication(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        application_category="fertilizer",
        product_name="Bio-Organic Compost NPK",
        product_type="Organic Fertilizer",
        quantity=Decimal("500.00"),
        unit="kg",
        unit_cost=Decimal("18.00"),
        total_cost=Decimal("9000.00"),
        application_date=date.today() - timedelta(days=12),
        application_method="Soil Incorporation",
        purpose="Basal vegetative nutrition boost",
        notes="Applied during soil conditioning",
    )
    app2 = AgriculturalApplication(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field2.id,
        crop_id=crop2.id,
        application_category="pesticide",
        product_name="Neem Oil Botanical Extract 10000 ppm",
        product_type="Bio-Pesticide",
        quantity=Decimal("5.00"),
        unit="L",
        unit_cost=Decimal("650.00"),
        total_cost=Decimal("3250.00"),
        application_date=date.today() - timedelta(days=5),
        application_method="Foliar Spray",
        purpose="Preventive aphid and thrips control",
    )
    db.add_all([app1, app2])
    db.commit()

    # 7. Create Phase 12 Expenses and Payment Disbursements
    today = date.today()

    # Expense 1: Paid Upfront (Fuel)
    e1 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        category="fuel",
        title="High-Speed Diesel for John Deere 5050D Tractor",
        description="120 Liters diesel fueling for field disc harrowing and plowing.",
        amount=Decimal("11400.00"),
        amount_paid=Decimal("11400.00"),
        outstanding_balance=Decimal("0.00"),
        expense_date=today - timedelta(days=14),
        payment_status="paid",
        payment_method="upi",
        vendor_name="Bharat Petroleum Kisan Fuel Pump",
        invoice_number="BPCL-2026-9812",
        transaction_reference="UPI/6291829103/OKAXIS",
        notes="Full tank fill-up before Kharif harrowing cycle.",
        created_by_id=user.id,
    )
    p1 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e1.id,
        amount=Decimal("11400.00"),
        payment_date=today - timedelta(days=14),
        payment_method="upi",
        transaction_reference="UPI/6291829103/OKAXIS",
        notes="Settled via GPay at fuel bunk.",
    )

    # Expense 2: Partially Paid (Maintenance & Repairs)
    e2 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        category="maintenance_and_repairs",
        title="Submersible Irrigation Pump 7.5HP Rewinding & Bearing Service",
        description="Pump burn overhaul, copper rewinding, and mechanical seal replacement.",
        amount=Decimal("14500.00"),
        amount_paid=Decimal("8000.00"),
        outstanding_balance=Decimal("6500.00"),
        expense_date=today - timedelta(days=8),
        payment_status="partially_paid",
        payment_method="bank_transfer",
        vendor_name="Mauli Electrical & Agro Machinery Works",
        invoice_number="INV-MEW-441",
        transaction_reference="IMPS/NEFT/55490123",
        notes="Advance paid upon delivery. Balance due after 15 days of test run.",
        created_by_id=user.id,
    )
    p2 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e2.id,
        amount=Decimal("8000.00"),
        payment_date=today - timedelta(days=8),
        payment_method="bank_transfer",
        transaction_reference="IMPS/NEFT/55490123",
        notes="Initial mobilization advance paid to technician.",
    )

    # Expense 3: Unpaid (Labour)
    e3 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        category="labour",
        title="Weeding & Earthing-up Labour Contract (Batch 1)",
        description="Contract weeding crew of 10 workers for 4 days on Plot A.",
        amount=Decimal("18000.00"),
        amount_paid=Decimal("0.00"),
        outstanding_balance=Decimal("18000.00"),
        expense_date=today - timedelta(days=3),
        payment_status="unpaid",
        vendor_name="Shree Ram Labour Group",
        invoice_number="SRLG-104",
        notes="Payment pending final inspection of plot by supervisor on Friday.",
        created_by_id=user.id,
    )

    # Expense 4: Paid Upfront (Seeds)
    e4 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        category="seeds",
        title="Certified Organic Soybean Seeds (JS 335)",
        description="10 Bags (30 kg each) certified foundation seed with 98% germination rate.",
        amount=Decimal("16500.00"),
        amount_paid=Decimal("16500.00"),
        outstanding_balance=Decimal("0.00"),
        expense_date=today - timedelta(days=20),
        payment_status="paid",
        payment_method="cheque",
        vendor_name="Maharashtra State Seeds Corp (Mahabeej)",
        invoice_number="MBJ-NSK-2026-778",
        transaction_reference="CHQ# 004128",
        notes="Purchased with 10% government subsidy rebate.",
        created_by_id=user.id,
    )
    p4 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e4.id,
        amount=Decimal("16500.00"),
        payment_date=today - timedelta(days=20),
        payment_method="cheque",
        transaction_reference="CHQ# 004128",
        notes="Cleared through SBI Agri Branch.",
    )

    # Expense 5: Paid Upfront (Fertilizer)
    e5 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field2.id,
        crop_id=crop2.id,
        category="fertilizer",
        title="Prom Bio-Fertilizer & Micronutrient Granules",
        description="Phosphate Rich Organic Manure (PROM) 25 bags.",
        amount=Decimal("12500.00"),
        amount_paid=Decimal("12500.00"),
        outstanding_balance=Decimal("0.00"),
        expense_date=today - timedelta(days=16),
        payment_status="paid",
        payment_method="cash",
        vendor_name="Kisan Seva Kendra",
        invoice_number="KSK-8812",
        transaction_reference="CASH-REC-112",
        notes="Cash payment against tax invoice.",
        created_by_id=user.id,
    )
    p5 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e5.id,
        amount=Decimal("12500.00"),
        payment_date=today - timedelta(days=16),
        payment_method="cash",
        transaction_reference="CASH-REC-112",
        notes="Cash paid at store counter.",
    )

    # Expense 6: Partially Paid with 2 installments (Equipment)
    e6 = Expense(
        id=uuid.uuid4(),
        farm_id=farm2.id,
        field_id=field3.id,
        category="equipment",
        title="STIHL High-Pressure Orchard Power Sprayer (50L Trolley)",
        description="High-reach petrol sprayer for Alphonso canopy pest management.",
        amount=Decimal("32000.00"),
        amount_paid=Decimal("20000.00"),
        outstanding_balance=Decimal("12000.00"),
        expense_date=today - timedelta(days=25),
        payment_status="partially_paid",
        payment_method="bank_transfer",
        vendor_name="Agro Tech Solutions Pune",
        invoice_number="ATS-2026-990",
        notes="Purchased under 2-installment supplier agreement.",
        created_by_id=user.id,
    )
    p6_1 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e6.id,
        amount=Decimal("10000.00"),
        payment_date=today - timedelta(days=25),
        payment_method="bank_transfer",
        transaction_reference="TXN-BOOKING-9901",
        notes="Initial booking deposit.",
    )
    p6_2 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e6.id,
        amount=Decimal("10000.00"),
        payment_date=today - timedelta(days=10),
        payment_method="upi",
        transaction_reference="UPI/77192839/YESB",
        notes="Second installment upon delivery of equipment.",
    )

    # Expense 7: Paid (Electricity)
    e7 = Expense(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        category="electricity",
        title="MSEDCL Agricultural Power Meter Bill (June-July)",
        description="High-tension 10HP dedicated agricultural feeder bill.",
        amount=Decimal("4320.00"),
        amount_paid=Decimal("4320.00"),
        outstanding_balance=Decimal("0.00"),
        expense_date=today - timedelta(days=7),
        payment_status="paid",
        payment_method="upi",
        vendor_name="Maharashtra State Electricity Distribution Co.",
        invoice_number="LT-AG-091823901",
        transaction_reference="UPI/BILLPAY/992819",
        notes="Paid online through Mahavitaran portal.",
        created_by_id=user.id,
    )
    p7 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e7.id,
        amount=Decimal("4320.00"),
        payment_date=today - timedelta(days=7),
        payment_method="upi",
        transaction_reference="UPI/BILLPAY/992819",
        notes="Instant payment confirmation receipt generated.",
    )

    # Expense 8: Paid (Transportation)
    e8 = Expense(
        id=uuid.uuid4(),
        farm_id=farm2.id,
        category="transportation",
        title="Fruit Crates Transport to Vashi APMC Mandi, Mumbai",
        description="Tata 407 tempo freight for 250 wooden mango packing crates.",
        amount=Decimal("8500.00"),
        amount_paid=Decimal("8500.00"),
        outstanding_balance=Decimal("0.00"),
        expense_date=today - timedelta(days=2),
        payment_status="paid",
        payment_method="cash",
        vendor_name="Konkan Freight Logistics",
        invoice_number="LR-KFL-5510",
        transaction_reference="CASH-VOUCHER-088",
        notes="Bilty receipt filed with accounts.",
        created_by_id=user.id,
    )
    p8 = ExpensePayment(
        id=uuid.uuid4(),
        expense_id=e8.id,
        amount=Decimal("8500.00"),
        payment_date=today - timedelta(days=2),
        payment_method="cash",
        transaction_reference="CASH-VOUCHER-088",
        notes="Paid to driver upon delivery sign-off.",
    )

    db.add_all([
        e1, p1,
        e2, p2,
        e3,
        e4, p4,
        e5, p5,
        e6, p6_1, p6_2,
        e7, p7,
        e8, p8,
    ])
    db.commit()

    # 8. Create Harvests
    h1 = Harvest(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        harvest_date=today - timedelta(days=2),
        quantity=Decimal("3200.00"),
        unit="kg",
        quality_grade="Grade A",
        harvest_method="Combine Harvester",
        storage_location="Main Granary Silo #2",
        batch_number="SOY-2026-B1",
        notes="First batch harvested with optimal 12% moisture level.",
    )
    h2 = Harvest(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field2.id,
        crop_id=crop2.id,
        harvest_date=today - timedelta(days=5),
        quantity=Decimal("1500.00"),
        unit="kg",
        quality_grade="Grade A",
        harvest_method="Manual Picking",
        storage_location="Cold Storage Unit A",
        batch_number="CORN-2026-B1",
        notes="Prime sweet corn picked at dawn for crisp sweetness.",
    )
    db.add_all([h1, h2])
    db.commit()

    # 9. Create Sales & Sale Payments
    s1 = Sale(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        crop_id=crop1.id,
        harvest_id=h1.id,
        sale_number="SALE-202610-0001",
        sale_date=today - timedelta(days=1),
        buyer_name="Maha-Agro Edible Oils Ltd",
        buyer_phone="+91 94231 88990",
        product_name="JS 335 Organic Soybean",
        quantity=Decimal("3000.00"),
        unit="kg",
        unit_price=Decimal("48.00"),
        gross_amount=Decimal("144000.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("144000.00"),
        amount_paid=Decimal("100000.00"),
        outstanding_amount=Decimal("44000.00"),
        payment_status="partially_paid",
        payment_method="bank_transfer",
        notes="High-protein soybean batch. Balance payable in 15 days.",
        created_by_id=user.id,
    )
    sp1 = SalePayment(
        id=uuid.uuid4(),
        sale_id=s1.id,
        amount=Decimal("100000.00"),
        payment_date=today - timedelta(days=1),
        payment_method="bank_transfer",
        reference_number="NEFT/HDFC/88291039",
        notes="Advance bank transfer on loading weighbridge receipt.",
    )

    s2 = Sale(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        crop_id=crop2.id,
        harvest_id=h2.id,
        sale_number="SALE-202610-0002",
        sale_date=today - timedelta(days=4),
        buyer_name="Fresh Mart Supermarket Chain",
        buyer_phone="+91 98220 11223",
        product_name="Sugar 75 Sweet Corn",
        quantity=Decimal("1200.00"),
        unit="kg",
        unit_price=Decimal("25.00"),
        gross_amount=Decimal("30000.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("30000.00"),
        amount_paid=Decimal("30000.00"),
        outstanding_amount=Decimal("0.00"),
        payment_status="paid",
        payment_method="upi",
        notes="Sweet corn delivered in refrigerated crates.",
        created_by_id=user.id,
    )
    sp2 = SalePayment(
        id=uuid.uuid4(),
        sale_id=s2.id,
        amount=Decimal("30000.00"),
        payment_date=today - timedelta(days=4),
        payment_method="upi",
        reference_number="UPI/YESB/339102",
        notes="Full spot payment via UPI on delivery.",
    )

    db.add_all([s1, sp1, s2, sp2])
    db.commit()

    # 10. Create Other Farm Income
    inc1 = OtherIncome(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        income_date=today - timedelta(days=8),
        category="government_subsidy",
        description="Direct Benefit Transfer for Micro-Irrigation Drip Subsidy",
        source="Department of Agriculture, Maharashtra",
        amount=Decimal("45000.00"),
        payment_method="bank_transfer",
        reference_number="DBT/AGRI/SUB/2026/0991",
        notes="Approved under Pradhan Mantri Krishi Sinchayee Yojana.",
        created_by_id=user.id,
    )
    inc2 = OtherIncome(
        id=uuid.uuid4(),
        farm_id=farm2.id,
        income_date=today - timedelta(days=3),
        category="equipment_rental",
        description="Rotavator and power tiller hiring fees",
        source="Kisan Mitra Cooperative Farm",
        amount=Decimal("6500.00"),
        payment_method="upi",
        reference_number="UPI/RENT/44091",
        notes="Rotavator and power tiller rental for 2 days.",
        created_by_id=user.id,
    )
    db.add_all([inc1, inc2])
    db.commit()

    # 11. Create Farm Calendar Events
    today_dt = datetime(today.year, today.month, today.day, 0, 0, 0)

    # Event 1: Today Timed (07:00 - 09:30) - In Progress Irrigation
    cal1 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        assigned_labour_id=l1.id,
        title="Morning Drip Irrigation Cycle",
        description="Run automated borewell drip line for 2.5 hours with soluble micronutrients.",
        activity_type="irrigation",
        start_datetime=today_dt.replace(hour=7, minute=0),
        end_datetime=today_dt.replace(hour=9, minute=30),
        all_day=False,
        status="in_progress",
        priority="high",
        notes="Check dripper line pressure gauge at Section B.",
        created_by_id=user.id,
    )

    # Event 2: Today All-Day - Planned Soil Testing
    cal2 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field2.id,
        crop_id=crop2.id,
        title="Field Plot Inspection & Soil Testing",
        description="Comprehensive soil NPK and pH core sampling for upcoming rabi rotation.",
        activity_type="crop_inspection",
        start_datetime=today_dt,
        end_datetime=today_dt.replace(hour=23, minute=59),
        all_day=True,
        status="planned",
        priority="medium",
        notes="Collect 10 core samples across zigzag pattern.",
        created_by_id=user.id,
    )

    # Event 3: Yesterday Completed - Fertilizer Application
    cal3 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        assigned_labour_id=l2.id,
        title="Organic Fertilizer Foliar Application",
        description="Applied seaweed organic bio-stimulant foliar spray during cool evening hours.",
        activity_type="fertilizer_application",
        start_datetime=today_dt - timedelta(days=1, hours=-16),
        end_datetime=today_dt - timedelta(days=1, hours=-18),
        all_day=False,
        status="completed",
        priority="high",
        actual_completion_datetime=today_dt - timedelta(days=1, hours=-18),
        notes="Foliar absorption optimal, no rain forecast within 48h.",
        created_by_id=user.id,
    )

    # Event 4: Tomorrow Planned - Pesticide Spray
    cal4 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field2.id,
        crop_id=crop2.id,
        assigned_labour_id=l1.id,
        title="Bio-Pesticide Neem Oil Spraying",
        description="Targeted protective spray against stem borer in Sweet Corn parcel.",
        activity_type="pesticide_application",
        start_datetime=today_dt + timedelta(days=1, hours=8),
        end_datetime=today_dt + timedelta(days=1, hours=11),
        all_day=False,
        status="planned",
        priority="medium",
        notes="Safety goggles and masks handed over to spray crew.",
        created_by_id=user.id,
    )

    # Event 5: Multi-Day Harvesting Campaign (3 days)
    cal5 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        field_id=field1.id,
        crop_id=crop1.id,
        assigned_labour_id=l1.id,
        title="Primary Soybean Harvest & Threshing Campaign",
        description="Full combine harvester mobilization across North Terrace Plot A.",
        activity_type="harvesting",
        start_datetime=today_dt + timedelta(days=3),
        end_datetime=today_dt + timedelta(days=5, hours=18),
        all_day=True,
        status="planned",
        priority="high",
        notes="Coordinate gunny bags and tractor trailers with transport team.",
        created_by_id=user.id,
    )

    # Event 6: Planned Sales / Delivery Appointment
    cal6 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        title="Produce Dispatch & Weighbridge Appointment",
        description="Maha-Agro logistics truck arriving for final harvest batch pickup.",
        activity_type="sales_appointment",
        start_datetime=today_dt + timedelta(days=6, hours=10),
        end_datetime=today_dt + timedelta(days=6, hours=13),
        all_day=False,
        status="planned",
        priority="medium",
        notes="Generate APMC transit gate pass prior to truck arrival.",
        created_by_id=user.id,
    )

    # Event 7: Equipment Maintenance
    cal7 = FarmCalendarEvent(
        id=uuid.uuid4(),
        farm_id=farm1.id,
        title="Tractor 500-Hour Preventative Overhaul",
        description="Engine oil replacement, hydraulic filter cleaning, and fan belt tension check.",
        activity_type="equipment_maintenance",
        start_datetime=today_dt + timedelta(days=8, hours=9),
        end_datetime=today_dt + timedelta(days=8, hours=12),
        all_day=False,
        status="planned",
        priority="low",
        notes="Mahindra service technician arriving on site.",
        created_by_id=user.id,
    )

    db.add_all([cal1, cal2, cal3, cal4, cal5, cal6, cal7])
    db.commit()

    print("Successfully seeded all demo entities:")
    print(f" - 1 User ({user.email} / password123)")
    print(f" - 2 Farms")
    print(f" - 3 Fields")
    print(f" - 3 Crops")
    print(f" - 3 Labourers")
    print(f" - 2 Agricultural Applications")
    print(f" - 8 Expenses (Total: INR 1,17,220)")
    print(f" - 2 Harvest Logs (Soybean & Sweet Corn: 4,700 kg)")
    print(f" - 2 Produce Sales (Total: INR 1,74,000 | Paid: INR 1,30,000)")
    print(f" - 2 Other Farm Income Streams (Total: INR 51,500)")
    print(f" - 7 Farm Calendar Activities (Scheduled across month, week & today)")
    db.close()

if __name__ == "__main__":
    seed()
