import uuid
from datetime import datetime

from pydantic import BaseModel


class EventResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    source: str
    source_url: str | None
    club_name: str | None
    image_url: str | None
    latitude: float | None
    longitude: float | None
    location_name: str | None
    event_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateEventRequest(BaseModel):
    title: str
    description: str | None = None
    club_name: str | None = None
    image_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None
    event_date: datetime | None = None


class EventListResponse(BaseModel):
    events: list[EventResponse]
    total: int
