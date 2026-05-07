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
