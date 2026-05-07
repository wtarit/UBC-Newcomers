import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.landmark import Landmark
from app.schemas.landmark import LandmarkListResponse, LandmarkResponse

router = APIRouter(prefix="/landmarks", tags=["Landmarks"])


@router.get("", response_model=LandmarkListResponse)
async def list_landmarks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Landmark).order_by(Landmark.name))
    landmarks = result.scalars().all()
    return LandmarkListResponse(landmarks=[LandmarkResponse.model_validate(l) for l in landmarks])


@router.get("/{landmark_id}", response_model=LandmarkResponse)
async def get_landmark(landmark_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Landmark).where(Landmark.id == landmark_id))
    landmark = result.scalar_one_or_none()
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    return LandmarkResponse.model_validate(landmark)
