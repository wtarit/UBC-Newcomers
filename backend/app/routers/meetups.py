import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.meetup import Meetup
from app.models.landmark import Landmark
from app.models.user import User
from app.schemas.meetup import CreateMeetupRequest, MeetupListResponse, MeetupResponse
from app.utils.geo import haversine_km

router = APIRouter(prefix="/meetups", tags=["Meetups"])


@router.post("", response_model=MeetupResponse)
async def create_meetup(
    body: CreateMeetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    landmark = await db.execute(select(Landmark).where(Landmark.id == body.landmark_id))
    if not landmark.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Landmark not found")

    meetup = Meetup(creator_id=current_user.id, landmark_id=body.landmark_id, scheduled_time=body.scheduled_time)
    db.add(meetup)
    await db.commit()
    await db.refresh(meetup)
    return MeetupResponse.model_validate(meetup)


@router.get("", response_model=MeetupListResponse)
async def list_active_meetups(
    radius_km: float = Query(default=5.0, le=50.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meetup).where(Meetup.status == "active", Meetup.creator_id != current_user.id)
    )
    meetups = result.scalars().all()

    if current_user.last_latitude and current_user.last_longitude:
        filtered = []
        for m in meetups:
            dist = haversine_km(
                current_user.last_latitude, current_user.last_longitude,
                m.landmark.latitude, m.landmark.longitude,
            )
            if dist <= radius_km:
                filtered.append(m)
        meetups = filtered

    return MeetupListResponse(
        meetups=[MeetupResponse.model_validate(m) for m in meetups],
        total=len(meetups),
    )


@router.put("/{meetup_id}/join", response_model=MeetupResponse)
async def join_meetup(
    meetup_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meetup).where(Meetup.id == meetup_id))
    meetup = result.scalar_one_or_none()
    if not meetup:
        raise HTTPException(status_code=404, detail="Meetup not found")
    if meetup.status != "active":
        raise HTTPException(status_code=400, detail="Meetup is not active")
    if meetup.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot join your own meetup")
    if meetup.joiner_id:
        raise HTTPException(status_code=400, detail="Meetup already has a participant")

    meetup.joiner_id = current_user.id
    meetup.status = "accepted"
    await db.commit()
    await db.refresh(meetup)
    return MeetupResponse.model_validate(meetup)


@router.put("/{meetup_id}/complete", response_model=MeetupResponse)
async def complete_meetup(
    meetup_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meetup).where(Meetup.id == meetup_id))
    meetup = result.scalar_one_or_none()
    if not meetup:
        raise HTTPException(status_code=404, detail="Meetup not found")
    if current_user.id not in (meetup.creator_id, meetup.joiner_id):
        raise HTTPException(status_code=403, detail="Not a participant of this meetup")
    if meetup.status != "accepted":
        raise HTTPException(status_code=400, detail="Meetup must be accepted first")

    meetup.status = "completed"

    creator = await db.execute(select(User).where(User.id == meetup.creator_id))
    creator_user = creator.scalar_one()
    creator_user.meetups_completed += 1

    if meetup.joiner_id:
        joiner = await db.execute(select(User).where(User.id == meetup.joiner_id))
        joiner_user = joiner.scalar_one()
        joiner_user.meetups_completed += 1

    await db.commit()
    await db.refresh(meetup)
    return MeetupResponse.model_validate(meetup)


@router.put("/{meetup_id}/cancel", response_model=MeetupResponse)
async def cancel_meetup(
    meetup_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meetup).where(Meetup.id == meetup_id))
    meetup = result.scalar_one_or_none()
    if not meetup:
        raise HTTPException(status_code=404, detail="Meetup not found")
    if meetup.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can cancel")

    meetup.status = "cancelled"
    await db.commit()
    await db.refresh(meetup)
    return MeetupResponse.model_validate(meetup)
