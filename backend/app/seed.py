"""Seed UBC landmarks into the database."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.landmark import Landmark

UBC_LANDMARKS = [
    {
        "name": "Nitobe Memorial Garden",
        "description": "A traditional Japanese garden — one of the top five Japanese gardens outside Japan",
        "latitude": 49.2667,
        "longitude": -123.2597,
    },
    {
        "name": "Rose Garden",
        "description": "A beautiful rose garden with views of the North Shore mountains and ocean",
        "latitude": 49.2694,
        "longitude": -123.2565,
    },
    {
        "name": "Wreck Beach",
        "description": "Famous clothing-optional beach at the base of UBC cliffs",
        "latitude": 49.2622,
        "longitude": -123.2619,
    },
    {
        "name": "The Nest (AMS Student Union Building)",
        "description": "The main student union building with food, study spaces, and club offices",
        "latitude": 49.2665,
        "longitude": -123.2490,
    },
    {
        "name": "Irving K. Barber Learning Centre",
        "description": "UBC's main library and study hub",
        "latitude": 49.2677,
        "longitude": -123.2524,
    },
    {
        "name": "Koerner Library",
        "description": "A quieter library with a beautiful reading room",
        "latitude": 49.2665,
        "longitude": -123.2535,
    },
    {
        "name": "Museum of Anthropology",
        "description": "World-renowned museum featuring First Nations art and architecture",
        "latitude": 49.2695,
        "longitude": -123.2594,
    },
    {
        "name": "UBC Aquatic Centre",
        "description": "Olympic-sized pool and recreation facility",
        "latitude": 49.2630,
        "longitude": -123.2456,
    },
    {
        "name": "Buchanan Tower",
        "description": "Arts building with a great courtyard for meeting",
        "latitude": 49.2693,
        "longitude": -123.2547,
    },
    {
        "name": "Engineering Cairn",
        "description": "Historic landmark and popular meeting spot",
        "latitude": 49.2622,
        "longitude": -123.2493,
    },
    {
        "name": "UBC Farm",
        "description": "A 24-hectare farm with markets and community events",
        "latitude": 49.2534,
        "longitude": -123.2381,
    },
    {
        "name": "Pacific Spirit Regional Park",
        "description": "763-hectare park with trails surrounding UBC campus",
        "latitude": 49.2600,
        "longitude": -123.2300,
    },
]

UBC_TEST_EVENTS = [
    {
        "title": "[TEST] UBC Welcome Back BBQ",
        "description": "THIS IS A TEST EVENT. The biggest event of the year to welcome all students back to campus with music and food!",
        "source": "manual",
        "club_name": "AMS UBC (TEST)",
        "latitude": 49.2668,
        "longitude": -123.2499,
        "location_name": "AMS Nest Plaza (TEST)",
        "event_date": "2026-09-10T12:00:00Z",
    },
    {
        "title": "[TEST] Night Market at the Farm",
        "description": "THIS IS A TEST EVENT. Local food vendors, live music, and fresh produce under the stars.",
        "source": "manual",
        "club_name": "UBC Farm (TEST)",
        "latitude": 49.2534,
        "longitude": -123.2381,
        "location_name": "UBC Farm (TEST)",
        "event_date": "2026-07-15T18:00:00Z",
    },
    {
        "title": "[TEST] Main Mall Movie Night",
        "description": "THIS IS A TEST EVENT. Outdoor cinema experience on the big screen! Bring your blankets.",
        "source": "manual",
        "club_name": "UBC Film Society (TEST)",
        "latitude": 49.2655,
        "longitude": -123.2535,
        "location_name": "Main Mall (TEST)",
        "event_date": "2026-08-20T20:30:00Z",
    },
]


async def seed_landmarks(db: AsyncSession) -> int:
    result = await db.execute(select(Landmark))
    if result.scalars().first():
        return 0

    count = 0
    for data in UBC_LANDMARKS:
        db.add(Landmark(**data))
        count += 1

    await db.commit()
    return count


async def seed_events(db: AsyncSession) -> int:
    from app.models.event import Event
    from datetime import datetime

    result = await db.execute(select(Event))
    if result.scalars().first():
        return 0

    count = 0
    for data in UBC_TEST_EVENTS:
        event_data = data.copy()
        event_data["event_date"] = datetime.fromisoformat(data["event_date"].replace("Z", "+00:00"))
        db.add(Event(**event_data))
        count += 1

    await db.commit()
    return count
