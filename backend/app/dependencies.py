from fastapi import Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services import firebase_auth


class FirebaseIdentity:
    def __init__(self, uid: str, email: str, name: str):
        self.uid = uid
        self.email = email
        self.name = name


async def get_firebase_identity(
    authorization: str = Header(..., description="Bearer <id_token>"),
) -> FirebaseIdentity:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]
    decoded = firebase_auth.verify_id_token(token)

    if not decoded.get("email_verified"):
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox and verify your email.")

    return FirebaseIdentity(
        uid=decoded["uid"],
        email=decoded["email"],
        name=decoded.get("name", ""),
    )


async def get_current_user(
    identity: FirebaseIdentity = Depends(get_firebase_identity),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.firebase_uid == identity.uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found. Complete onboarding first.")
    return user
