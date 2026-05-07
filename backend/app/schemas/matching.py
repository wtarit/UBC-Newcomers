from pydantic import BaseModel

from app.schemas.event import EventResponse
from app.schemas.user import UserPublicResponse


class MatchedUserResponse(BaseModel):
    user: UserPublicResponse
    match_score: float
    match_reason: str


class MatchedEventResponse(BaseModel):
    event: EventResponse
    match_score: float
    match_reason: str


class UserMatchListResponse(BaseModel):
    matches: list[MatchedUserResponse]


class EventMatchListResponse(BaseModel):
    matches: list[MatchedEventResponse]
