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
    user_id: uuid.UUID
    full_name: str
    latitude: float | None
    longitude: float | None
    last_active_at: datetime | None


class ConnectionLocationPairResponse(BaseModel):
    mine: ConnectionLocationResponse
    theirs: ConnectionLocationResponse


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
