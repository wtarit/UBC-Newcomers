import uuid

from pydantic import BaseModel


class LandmarkResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    latitude: float
    longitude: float
    image_url: str | None

    model_config = {"from_attributes": True}


class LandmarkListResponse(BaseModel):
    landmarks: list[LandmarkResponse]
