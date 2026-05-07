from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    VerifyEmailRequest,
)
from app.services import cognito

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignupResponse)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    cognito_sub = cognito.sign_up(body.email, body.password, body.full_name)
    user = User(cognito_sub=cognito_sub, email=body.email, full_name=body.full_name)
    db.add(user)
    await db.commit()
    return SignupResponse(message="Verification code sent to your email", cognito_sub=cognito_sub)


@router.post("/verify", response_model=MessageResponse)
async def verify_email(body: VerifyEmailRequest):
    cognito.confirm_sign_up(body.email, body.confirmation_code)
    return MessageResponse(message="Email verified successfully")


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    tokens = cognito.login(body.email, body.password)
    return LoginResponse(**tokens)


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh(body: RefreshTokenRequest):
    tokens = cognito.refresh_token(body.refresh_token)
    return RefreshTokenResponse(**tokens)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest):
    cognito.forgot_password(body.email)
    return MessageResponse(message="Password reset code sent to your email")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    cognito.confirm_forgot_password(body.email, body.confirmation_code, body.new_password)
    return MessageResponse(message="Password reset successfully")
