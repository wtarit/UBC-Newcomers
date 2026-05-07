import uuid
from datetime import datetime

from pydantic import BaseModel


class OnboardingRequest(BaseModel):
    major: str | None = None
    year_standing: int | None = None
    origin: str | None = None
    interests: list[str] | None = None
    transfer_from: str | None = None
    faculty: str | None = None
    bio: str | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    major: str | None = None
    year_standing: int | None = None
    origin: str | None = None
    interests: list[str] | None = None
    transfer_from: str | None = None
    faculty: str | None = None
    bio: str | None = None


class UpdateLocationRequest(BaseModel):
    latitude: float
    longitude: float


class SetHomeLocationRequest(BaseModel):
    latitude: float
    longitude: float


class UpdateAvailabilityRequest(BaseModel):
    is_available_to_meet: bool


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    major: str | None
    year_standing: int | None
    origin: str | None
    interests: list[str] | None
    transfer_from: str | None
    faculty: str | None
    bio: str | None
    profile_picture_url: str | None = None
    home_latitude: float | None
    home_longitude: float | None
    is_available_to_meet: bool
    connections_count: int
    meetups_completed: int
    events_attended: int
    onboarding_completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    major: str | None
    year_standing: int | None
    origin: str | None
    interests: list[str] | None
    faculty: str | None
    bio: str | None
    profile_picture_url: str | None = None
    is_available_to_meet: bool
    connections_count: int

    model_config = {"from_attributes": True}


class NearbyUserResponse(BaseModel):
    user: UserPublicResponse
    distance_km: float


class UserStatsResponse(BaseModel):
    connections_count: int
    meetups_completed: int
    events_attended: int
    member_since: datetime


class PresignedUploadResponse(BaseModel):
    upload_url: str
    file_key: str
