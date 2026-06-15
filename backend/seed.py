"""Seed script — populates the database with demo data for development and judging.

Run with: python seed.py
Requires: DATABASE_URL set in .env or environment
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session, engine
from app.models import Base, Worker, Client, JobHistory


# Fixed UUIDs for demo login accounts (must match frontend/src/lib/auth.ts)
THABO_UUID = uuid.UUID("e71d43bb-77ba-42cf-a914-555d0ee70753")
SARAH_UUID = uuid.UUID("c4e89f23-9b1a-4d5e-8f6c-3a7b9d2e1f4a")
JAMES_UUID = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


# Demo workers around Pretoria, South Africa
DEMO_WORKERS = [
    {
        "id": SARAH_UUID,
        "name": "Sarah Mokoena",
        "email": "sarah@demo.nelb",
        "phone": "+27 71 000 0001",
        "skills": ["cleaning", "gardening"],
        "reliability_score": 95.0,
        "price_factor": 0.95,
        "latitude": -25.7463,
        "longitude": 28.1885,
        "address": "Hatfield, Pretoria",
        "is_available": True,
    },
    {
        "id": THABO_UUID,
        "name": "Thabo Mabena",
        "email": "thabo@demo.nelb",
        "phone": "+27 71 000 0002",
        "skills": ["painting", "tiling", "general repair"],
        "reliability_score": 88.0,
        "price_factor": 1.10,
        "latitude": -25.7625,
        "longitude": 28.2120,
        "address": "Sunnyside, Pretoria",
        "is_available": True,
    },
    {
        "name": "Lindiwe Nkosi",
        "email": "lindiwe@demo.nelb",
        "phone": "+27 71 000 0003",
        "skills": ["cleaning", "moving"],
        "reliability_score": 92.0,
        "price_factor": 0.90,
        "latitude": -25.7330,
        "longitude": 28.2515,
        "address": "Brooklyn, Pretoria",
        "is_available": True,
    },
    {
        "name": "David Botha",
        "email": "david@demo.nelb",
        "phone": "+27 71 000 0004",
        "skills": ["plumbing", "carpentry", "general repair"],
        "reliability_score": 78.0,
        "price_factor": 1.05,
        "latitude": -25.7800,
        "longitude": 28.2800,
        "address": "Garsfontein, Pretoria",
        "is_available": True,
    },
    {
        "name": "Nomsa Dlamini",
        "email": "nomsa@demo.nelb",
        "phone": "+27 71 000 0005",
        "skills": ["gardening", "cleaning"],
        "reliability_score": 96.0,
        "price_factor": 0.85,
        "latitude": -25.7550,
        "longitude": 28.2400,
        "address": "Arcadia, Pretoria",
        "is_available": True,
    },
    {
        "name": "Peter van der Merwe",
        "email": "peter@demo.nelb",
        "phone": "+27 71 000 0006",
        "skills": ["electrical", "plumbing", "general repair"],
        "reliability_score": 85.0,
        "price_factor": 1.20,
        "latitude": -25.7700,
        "longitude": 28.1900,
        "address": "Centurion, Pretoria",
        "is_available": True,
    },
    {
        "name": "Grace Sithole",
        "email": "grace@demo.nelb",
        "phone": "+27 71 000 0007",
        "skills": ["painting", "cleaning"],
        "reliability_score": 91.0,
        "price_factor": 1.00,
        "latitude": -25.7400,
        "longitude": 28.2650,
        "address": "Lynnwood, Pretoria",
        "is_available": True,
    },
    {
        "id": JAMES_UUID,
        "name": "James Moyo",
        "email": "james@demo.nelb",
        "phone": "+27 71 000 0008",
        "skills": ["carpentry", "tiling", "painting"],
        "reliability_score": 82.0,
        "price_factor": 1.15,
        "latitude": -25.7200,
        "longitude": 28.2300,
        "address": "Riviera, Pretoria",
        "is_available": False,  # Intentionally unavailable for testing
    },
    {
        "name": "Palesa Khumalo",
        "email": "palesa@demo.nelb",
        "phone": "+27 71 000 0009",
        "skills": ["moving", "cleaning", "general repair"],
        "reliability_score": 45.0,  # Intentionally low for testing reliability filter
        "price_factor": 0.80,
        "latitude": -25.7600,
        "longitude": 28.2200,
        "address": "Muckleneuk, Pretoria",
        "is_available": True,
    },
    {
        "name": "Michael Ndlovu",
        "email": "michael@demo.nelb",
        "phone": "+27 71 000 0010",
        "skills": ["tiling", "painting", "carpentry"],
        "reliability_score": 89.0,
        "price_factor": 1.10,
        "latitude": -25.7900,
        "longitude": 28.3100,
        "address": "Moreleta Park, Pretoria",
        "is_available": True,
    },
    {
        "name": "Fatima Abrahams",
        "email": "fatima@demo.nelb",
        "phone": "+27 71 000 0011",
        "skills": ["cleaning", "gardening", "painting"],
        "reliability_score": 94.0,
        "price_factor": 0.95,
        "latitude": -25.7450,
        "longitude": 28.2100,
        "address": "Colbyn, Pretoria",
        "is_available": True,
    },
    {
        "name": "Sipho Zulu",
        "email": "sipho@demo.nelb",
        "phone": "+27 71 000 0012",
        "skills": ["general repair", "moving", "carpentry"],
        "reliability_score": 75.0,
        "price_factor": 0.90,
        "latitude": -25.8100,
        "longitude": 28.2500,
        "address": "Faerie Glen, Pretoria",
        "is_available": True,
    },
    {
        "name": "Lerato Mosia",
        "email": "lerato@demo.nelb",
        "phone": "+27 71 000 0013",
        "skills": ["electrical", "general repair"],
        "reliability_score": 87.0,
        "price_factor": 1.05,
        "latitude": -25.7380,
        "longitude": 28.2200,
        "address": "Lynnwood Ridge, Pretoria",
        "is_available": True,
    },
]

# Demo employers
DEMO_CLIENTS = [
    {
        "name": "Mrs. Van Wyk",
        "email": "vanwyk@demo.nelb",
        "phone": "+27 82 000 0001",
        "latitude": -25.7500,
        "longitude": 28.2350,
        "address": "Hatfield, Pretoria",
    },
    {
        "name": "Mr. Molefe",
        "email": "molefe@demo.nelb",
        "phone": "+27 82 000 0002",
        "latitude": -25.7650,
        "longitude": 28.2450,
        "address": "Waterkloof, Pretoria",
    },
    {
        "name": "Mrs. Dlamini",
        "email": "dlamini@demo.nelb",
        "phone": "+27 82 000 0003",
        "latitude": -25.7750,
        "longitude": 28.2700,
        "address": "Centurion, Pretoria",
    },
]


async def seed():
    """Seed the database with demo data."""

    async with engine.begin() as conn:
        # Clean reset so schema changes (e.g. new columns) always apply.
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Create workers
        workers = []
        for w_data in DEMO_WORKERS:
            worker_id = w_data.pop("id", None) or uuid.uuid4()
            worker = Worker(id=worker_id, **w_data)
            session.add(worker)
            workers.append(worker)

        # Create clients
        clients = []
        for c_data in DEMO_CLIENTS:
            client = Client(id=uuid.uuid4(), **c_data)
            session.add(client)
            clients.append(client)

        await session.flush()

        # Create job history records
        now = datetime.now(timezone.utc)
        history_records = [
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[0].id,  # Sarah — cleaning
                client_id=clients[0].id,
                client_name="Mrs. Van Wyk",
                category="cleaning",
                description="Deep clean of 3-bedroom house",
                location="Hatfield, Pretoria",
                latitude=-25.7500,
                longitude=28.2350,
                completed_at=now - timedelta(days=2),
                rating=5.0,
                employer_feedback="Excellent work, very thorough",
                worker_notes="Used eco-friendly products as requested",
                payment_amount=450.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[0].id,  # Sarah — cleaning (recent, for fairness testing)
                client_id=clients[1].id,
                client_name="Mr. Molefe",
                category="cleaning",
                description="Office cleaning",
                location="Waterkloof, Pretoria",
                latitude=-25.7650,
                longitude=28.2450,
                completed_at=now - timedelta(days=4),
                rating=4.5,
                employer_feedback="Good job",
                worker_notes="",
                payment_amount=350.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — tiling (2025, for "last year" memory demo)
                client_id=clients[2].id,
                client_name="Mrs. Dlamini",
                category="tiling",
                description="Kitchen floor tiling — large-format porcelain",
                location="Centurion, Pretoria",
                latitude=-25.7750,
                longitude=28.2700,
                completed_at=now - timedelta(days=365),  # ~June 2025 — "last year"
                rating=5.0,
                employer_feedback="Beautiful work",
                worker_notes="Used large-format porcelain, grouted with charcoal mix",
                payment_amount=2800.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[3].id,  # David — plumbing
                client_id=clients[0].id,
                client_name="Mrs. Van Wyk",
                category="plumbing",
                description="Fixed leaking kitchen tap",
                location="Hatfield, Pretoria",
                latitude=-25.7500,
                longitude=28.2350,
                completed_at=now - timedelta(days=14),
                rating=4.0,
                employer_feedback="Fixed the issue, took a bit longer than expected",
                worker_notes="Replaced washer and valve seat",
                payment_amount=200.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[5].id,  # Peter — electrical
                client_id=clients[1].id,
                client_name="Mr. Molefe",
                category="general repair",
                description="Gate motor repair",
                location="Waterkloof, Pretoria",
                latitude=-25.7650,
                longitude=28.2450,
                completed_at=now - timedelta(days=120),  # 4 months ago
                rating=4.5,
                employer_feedback="Knew exactly what was wrong",
                worker_notes="Replaced gate motor capacitor and lubricated track",
                payment_amount=600.0,
            ),
            # --- Thabo Mabena's richer history (for the Memory recall demo) ---
            # All dated weeks/months ago — no impact on the 7-day fairness window.
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — painting
                client_id=clients[0].id,
                client_name="Mrs. Van Wyk",
                category="painting",
                description="Interior painting — lounge and two bedrooms, white walls with grey feature wall",
                location="Hatfield, Pretoria",
                latitude=-25.7500,
                longitude=28.2350,
                completed_at=now - timedelta(days=30),
                rating=4.5,
                employer_feedback="Great finish, very neat edges",
                worker_notes="Used Dulux Weatherguard white and Plascon grey. 2 coats each room.",
                payment_amount=3500.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — painting
                client_id=clients[1].id,
                client_name="Mr. Molefe",
                category="painting",
                description="Exterior wall repaint — front boundary wall",
                location="Waterkloof, Pretoria",
                latitude=-25.7650,
                longitude=28.2450,
                completed_at=now - timedelta(days=90),
                rating=5.0,
                employer_feedback="Looks brand new",
                worker_notes="Pressure washed first, applied 2 coats masonry paint. Charcoal colour.",
                payment_amount=1800.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — general repair
                client_id=clients[2].id,
                client_name="Mrs. Dlamini",
                category="general repair",
                description="Fixed broken gate latch and replaced hinges",
                location="Centurion, Pretoria",
                latitude=-25.7750,
                longitude=28.2700,
                completed_at=now - timedelta(days=45),
                rating=4.0,
                employer_feedback="Fixed quickly, good value",
                worker_notes="Replaced 2 rusted hinges with stainless steel. Adjusted latch alignment.",
                payment_amount=400.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — tiling
                client_id=clients[0].id,
                client_name="Mrs. Van Wyk",
                category="tiling",
                description="Bathroom floor retiling — 600x600 porcelain",
                location="Hatfield, Pretoria",
                latitude=-25.7500,
                longitude=28.2350,
                completed_at=now - timedelta(days=120),
                rating=5.0,
                employer_feedback="Perfect finish, even grout lines",
                worker_notes="Levelled floor with self-levelling compound, laid 600x600 grey porcelain with 2mm spacers.",
                payment_amount=4200.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=workers[1].id,  # Thabo — general repair
                client_id=clients[1].id,
                client_name="Mr. Molefe",
                category="general repair",
                description="Mounted 55-inch TV on drywall with heavy-duty bracket",
                location="Waterkloof, Pretoria",
                latitude=-25.7650,
                longitude=28.2450,
                completed_at=now - timedelta(days=21),
                rating=5.0,
                employer_feedback="Perfectly level, cables hidden",
                worker_notes="Used heavy-duty toggle bolts for drywall. Ran HDMI through wall cavity.",
                payment_amount=350.0,
            ),
        ]

        for record in history_records:
            session.add(record)

        await session.commit()
        print(f"✓ Seeded {len(workers)} workers")
        print(f"✓ Seeded {len(clients)} clients")
        print(f"✓ Seeded {len(history_records)} job history records")
        print("✓ Database ready for development")


if __name__ == "__main__":
    asyncio.run(seed())
