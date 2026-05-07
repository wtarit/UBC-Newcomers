from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.matching import (
    EventMatchListResponse,
    MatchedEventResponse,
    MatchedUserResponse,
    UserMatchListResponse,
)
from app.schemas.event import EventResponse
from app.schemas.user import UserPublicResponse
from app.services import bedrock

router = APIRouter(prefix="/matching", tags=["AI Matching"])


@router.get("/users", response_model=UserMatchListResponse)
async def get_matched_users(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id != current_user.id, User.onboarding_completed == True).limit(limit * 3)
    )
    candidates = list(result.scalars().all())

    matches = bedrock.match_users(current_user, candidates)

    return UserMatchListResponse(
        matches=[
            MatchedUserResponse(
                user=UserPublicResponse.model_validate(m["user"]),
                match_score=m["score"],
                match_reason=m["reason"],
            )
            for m in matches[:limit]
        ]
    )


@router.get("/events", response_model=EventMatchListResponse)
async def get_matched_events(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).order_by(Event.created_at.desc()).limit(limit * 3))
    events = list(result.scalars().all())

    matches = bedrock.match_events(current_user, events)

    return EventMatchListResponse(
        matches=[
            MatchedEventResponse(
                event=EventResponse.model_validate(m["event"]),
                match_score=m["score"],
                match_reason=m["reason"],
            )
            for m in matches[:limit]
        ]
    )
