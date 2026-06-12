"""Add more job history records for Thabo Mabena (for memory recall demo).

All jobs dated weeks/months in the past — won't affect fairness scoring.
Run once: python add_thabo_history.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from app.database import async_session
from app.models import Worker, Client, JobHistory


async def add_history():
    async with async_session() as session:
        # Find Thabo
        result = await session.execute(
            select(Worker).where(Worker.name == "Thabo Mabena")
        )
        thabo = result.scalar_one_or_none()
        if not thabo:
            print("Thabo not found!")
            return

        # Find clients
        result = await session.execute(select(Client))
        clients = list(result.scalars().all())

        now = datetime.now(timezone.utc)

        new_records = [
            JobHistory(
                id=uuid.uuid4(),
                worker_id=thabo.id,
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
                worker_notes="Used Dulux Weatherguard white and Plascon grey. 2 coats each room. Masked all skirting and door frames.",
                payment_amount=3500.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=thabo.id,
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
                worker_id=thabo.id,
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
                worker_id=thabo.id,
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
                worker_notes="Removed old tiles, levelled floor with self-levelling compound, laid 600x600 grey porcelain with 2mm spacers",
                payment_amount=4200.0,
            ),
            JobHistory(
                id=uuid.uuid4(),
                worker_id=thabo.id,
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
                worker_notes="Used heavy-duty toggle bolts for drywall. Ran HDMI through wall cavity. Spirit level confirmed.",
                payment_amount=350.0,
            ),
        ]

        for record in new_records:
            session.add(record)

        await session.commit()
        print(f"✓ Added {len(new_records)} job history records for Thabo Mabena")
        print("  - 2 painting jobs")
        print("  - 2 general repair jobs")
        print("  - 1 tiling job")
        print("✓ All dated 3+ weeks ago — no fairness impact")


if __name__ == "__main__":
    asyncio.run(add_history())
