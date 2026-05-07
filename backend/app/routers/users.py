import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import (
    NearbyUserResponse,
    OnboardingRequest,
    PresignedUploadResponse,
    SetHomeLocationRequest,
    UpdateAvailabilityRequest,
    UpdateLocationRequest,
    UpdateProfileRequest,
    UserPublicResponse,
    UserResponse,
    UserStatsResponse,
)
from app.services import s3
from app.utils.geo import haversine_km

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    response = UserResponse.model_validate(current_user)
    if current_user.profile_picture_key:
        response.profile_picture_url = s3.generate_presigned_download_url(current_user.profile_picture_key)
    return response


@router.post("/me/onboarding", response_model=UserResponse)
async def complete_onboarding(
    body: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/location", response_model=UserResponse)
async def update_location(
    body: UpdateLocationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.last_latitude = body.latitude
    current_user.last_longitude = body.longitude
    current_user.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/home-location", response_model=UserResponse)
async def set_home_location(
    body: SetHomeLocationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.home_latitude = body.latitude
    current_user.home_longitude = body.longitude
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/availability", response_model=UserResponse)
async def update_availability(
    body: UpdateAvailabilityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_available_to_meet = body.is_available_to_meet
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/me/presigned-upload", response_model=PresignedUploadResponse)
async def get_presigned_upload(
    content_type: str = Query(default="image/jpeg"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url, file_key = s3.generate_presigned_upload_url(current_user.id, content_type)
    current_user.profile_picture_key = file_key
    await db.commit()
    return PresignedUploadResponse(upload_url=url, file_key=file_key)


@router.post("/me/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a multipart file upload, store it in S3, save the key on the user record."""
    file_key = s3.upload_fileobj(current_user.id, file.file, file.content_type or "image/jpeg")
    current_user.profile_picture_key = file_key
    await db.commit()
    await db.refresh(current_user)
    response = UserResponse.model_validate(current_user)
    response.profile_picture_url = s3.generate_presigned_download_url(file_key)
    return response


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_stats(current_user: User = Depends(get_current_user)):
    return UserStatsResponse(
        connections_count=current_user.connections_count,
        meetups_completed=current_user.meetups_completed,
        events_attended=current_user.events_attended,
        member_since=current_user.created_at,
    )


@router.get("/nearby", response_model=list[NearbyUserResponse])
async def get_nearby_users(
    radius_km: float = Query(default=5.0, le=50.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.last_latitude or not current_user.last_longitude:
        raise HTTPException(status_code=400, detail="Update your location first")

    result = await db.execute(
        select(User).where(
            User.is_available_to_meet == True,
            User.id != current_user.id,
            User.last_latitude.is_not(None),
            User.last_longitude.is_not(None),
        )
    )
    users = result.scalars().all()

    nearby = []
    for user in users:
        dist = haversine_km(current_user.last_latitude, current_user.last_longitude, user.last_latitude, user.last_longitude)
        if dist <= radius_km:
            nearby.append(NearbyUserResponse(user=UserPublicResponse.model_validate(user), distance_km=round(dist, 2)))

    nearby.sort(key=lambda x: x.distance_km)
    return nearby


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublicResponse.model_validate(user)
