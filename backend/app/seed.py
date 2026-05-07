"""Seed UBC landmarks and test events into the database."""

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.landmark import Landmark
from app.models.event import Event

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
        "title": "[TEST] SEEDS Sustainability Symposium",
        "description": "THIS IS A TEST EVENT. A showcase of student-led research that uses the UBC campus as a 'living lab.' Innovative projects on urban biodiversity, waste reduction, and climate resilience.",
        "source": "manual",
        "club_name": "SEEDS Sustainability (TEST)",
        "latitude": 49.2625,
        "longitude": -123.2531,
        "location_name": "CIRS (2260 West Mall)",
        "event_date": "2026-05-07T09:00:00Z",
    },
    {
        "title": "[TEST] Science Rendezvous",
        "description": "THIS IS A TEST EVENT. Part of a national science festival, legendary for hands-on experiments like 'Liquid Nitrogen Ice Cream' and 'Mysterious Minerals'.",
        "source": "manual",
        "club_name": "Science Rendezvous (TEST)",
        "latitude": 49.2631,
        "longitude": -123.2513,
        "location_name": "Beaty Biodiversity Museum (2212 Main Mall)",
        "event_date": "2026-05-09T10:00:00Z",
    },
    {
        "title": "[TEST] Morning Bird Walk",
        "description": "THIS IS A TEST EVENT. Led by expert birders, focusing on identifying spring migrating species. Explore diverse habitats from forest floor to canopy.",
        "source": "manual",
        "club_name": "Botanical Garden (TEST)",
        "latitude": 49.2530,
        "longitude": -123.2520,
        "location_name": "UBC Botanical Garden (6804 SW Marine Dr)",
        "event_date": "2026-05-09T09:00:00Z",
    },
    {
        "title": "[TEST] Summer Session Residence Move-In",
        "description": "THIS IS A TEST EVENT. Primary move-in day for students enrolled in the Summer Term. The campus will be busy with new arrivals.",
        "source": "manual",
        "club_name": "UBC Housing (TEST)",
        "latitude": 49.2611,
        "longitude": -123.2581,
        "location_name": "Various Student Residences (Marine Drive Hub)",
        "event_date": "2026-05-10T09:00:00Z",
    },
    {
        "title": "[TEST] Summer Session Term 1 Official Start",
        "description": "THIS IS A TEST EVENT. The first day of the 2026 Summer Session. Fast-paced accelerated courses begin campus-wide.",
        "source": "manual",
        "club_name": "UBC Academic (TEST)",
        "latitude": 49.2668,
        "longitude": -123.2499,
        "location_name": "Campus-wide (AMS Nest)",
        "event_date": "2026-05-11T08:00:00Z",
    },
    {
        "title": "[TEST] Chung | Lind Gallery Drop-In Tour",
        "description": "THIS IS A TEST EVENT. Archivists lead this tour through rare maps, photographs, and artifacts focused on the history of the Gold Rush and Chinese immigration.",
        "source": "manual",
        "club_name": "IKB Gallery (TEST)",
        "latitude": 49.2677,
        "longitude": -123.2527,
        "location_name": "IKB Learning Centre (1961 East Mall)",
        "event_date": "2026-05-13T13:30:00Z",
    },
    {
        "title": "[TEST] T-Birds in Tech & Sauder Rooftop BBQ",
        "description": "THIS IS A TEST EVENT. High-profile networking event with tech leaders, local alumni, and students for informal networking and BBQ.",
        "source": "manual",
        "club_name": "UBC Sauder (TEST)",
        "latitude": 49.2651,
        "longitude": -123.2539,
        "location_name": "UBC Sauder (2053 Main Mall)",
        "event_date": "2026-05-13T17:00:00Z",
    },
    {
        "title": "[TEST] Biodiversity Farm Tour",
        "description": "THIS IS A TEST EVENT. A guided walk through the 24-hectare working farm. Highlights agroecology and organic crop production.",
        "source": "manual",
        "club_name": "UBC Farm (TEST)",
        "latitude": 49.2534,
        "longitude": -123.2381,
        "location_name": "UBC Farm (3461 Ross Drive)",
        "event_date": "2026-05-13T12:00:00Z",
    },
    {
        "title": "[TEST] MOA Exhibition: 'I Use My Haida Eyes'",
        "description": "THIS IS A TEST EVENT. World premiere of history robes by Haida artist Jut-ke-Nay Hazel Wilson. Opening night documents Haida perspectives.",
        "source": "manual",
        "club_name": "MOA (TEST)",
        "latitude": 49.2695,
        "longitude": -123.2594,
        "location_name": "Museum of Anthropology (6393 NW Marine Dr)",
        "event_date": "2026-05-14T18:00:00Z",
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
    # Clear existing events to ensure our test data is visible
    await db.execute(delete(Event))
    
    count = 0
    for data in UBC_TEST_EVENTS:
        event_data = data.copy()
        event_data["event_date"] = datetime.fromisoformat(data["event_date"].replace("Z", "+00:00"))
        db.add(Event(**event_data))
        count += 1

    await db.commit()
    return count
