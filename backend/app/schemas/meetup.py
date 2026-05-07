import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.landmark import LandmarkResponse
from app.schemas.user import UserPublicResponse


class CreateMeetupRequest(BaseModel):
    landmark_id: uuid.UUID
    scheduled_time: datetime | None = None


class MeetupResponse(BaseModel):
    id: uuid.UUID
    creator: UserPublicResponse
    joiner: UserPublicResponse | None
    landmark: LandmarkResponse
    status: str
    scheduled_time: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MeetupListResponse(BaseModel):
    meetups: list[MeetupResponse]
    total: int
