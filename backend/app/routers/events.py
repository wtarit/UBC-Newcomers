from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.event import CreateEventRequest, EventListResponse, EventResponse
from app.services.scraper import UBC_CLUB_INSTAGRAMS, scrape_and_store_events
from app.utils.geo import haversine_km

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=EventListResponse)
async def list_events(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(select(func.count()).select_from(Event))
    total = count_result.scalar()

    result = await db.execute(
        select(Event).order_by(Event.event_date.desc().nullslast(), Event.created_at.desc()).offset(skip).limit(limit)
    )
    events = result.scalars().all()
    return EventListResponse(events=[EventResponse.model_validate(e) for e in events], total=total)


@router.get("/nearby", response_model=EventListResponse)
async def list_nearby_events(
    radius_km: float = Query(default=10.0, le=50.0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lat = current_user.home_latitude or current_user.last_latitude
    lon = current_user.home_longitude or current_user.last_longitude
    if not lat or not lon:
        raise HTTPException(status_code=400, detail="Set your home location first")

    result = await db.execute(
        select(Event).where(Event.latitude.is_not(None), Event.longitude.is_not(None))
    )
    all_events = result.scalars().all()

    nearby = [e for e in all_events if haversine_km(lat, lon, e.latitude, e.longitude) <= radius_km]
    nearby.sort(key=lambda e: e.event_date or e.created_at, reverse=True)

    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in nearby[skip : skip + limit]],
        total=len(nearby),
    )


@router.post("", response_model=EventResponse)
async def create_event(
    body: CreateEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = Event(**body.model_dump(), source="manual")
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.post("/scrape", response_model=dict)
async def trigger_scrape(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await scrape_and_store_events(db, UBC_CLUB_INSTAGRAMS)
    return {"message": f"Scraped {count} events from {len(UBC_CLUB_INSTAGRAMS)} club pages"}
