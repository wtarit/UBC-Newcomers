import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserPublicResponse


class ConnectionResponse(BaseModel):
    id: uuid.UUID
    requester: UserPublicResponse
    receiver: UserPublicResponse
    status: str
    met_at_landmark: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectionListResponse(BaseModel):
    connections: list[ConnectionResponse]
    total: int


class ConnectionLocationResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    major: str | None
    origin: str | None
    interests: list[str] | None
    profile_picture_url: str | None = None
    is_available_to_meet: bool
    latitude: float | None
    longitude: float | None
    connected_at: datetime


class ConnectionLocationsListResponse(BaseModel):
    connections: list[ConnectionLocationResponse]
    total: int


class ConnectionLocationBriefResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    latitude: float | None
    longitude: float | None
    last_active_at: datetime | None


class ConnectionLocationPairResponse(BaseModel):
    mine: ConnectionLocationBriefResponse
    theirs: ConnectionLocationBriefResponse


class CreateConnectionMessageRequest(BaseModel):
    body: str


class ConnectionMessageResponse(BaseModel):
    id: uuid.UUID
    connection_id: uuid.UUID
    sender: UserPublicResponse
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectionMessageListResponse(BaseModel):
    messages: list[ConnectionMessageResponse]
    total: int
