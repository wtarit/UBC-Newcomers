from pydantic import BaseModel, EmailStr


class OTPSendRequest(BaseModel):
    email: EmailStr


class OTPSendResponse(BaseModel):
    message: str
    expires_in_seconds: int


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class OTPVerifyResponse(BaseModel):
    firebase_custom_token: str
    is_new_user: bool
    ubc_verified: bool


class UBCVerifySendRequest(BaseModel):
    email: EmailStr


class UBCVerifyConfirmRequest(BaseModel):
    email: EmailStr
    code: str
