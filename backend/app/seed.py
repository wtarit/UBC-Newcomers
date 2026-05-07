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
        "description": "Iconic Arts building with a great courtyard for meeting",
        "latitude": 49.2693,
        "longitude": -123.2547,
    },
    {
        "name": "Engineering Cairn",
        "description": "Historic landmark and popular meeting spot near engineering buildings",
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
