import uuid

from fastapi import Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services import cognito


async def get_current_user(
    authorization: str = Header(..., description="Bearer <access_token>"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]
    cognito_user = cognito.get_user_from_token(token)

    result = await db.execute(select(User).where(User.cognito_sub == cognito_user["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found. Complete signup first.")
    return user
