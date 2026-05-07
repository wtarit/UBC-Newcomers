from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    model_config = {"json_schema_extra": {"examples": [{"email": "student@student.ubc.ca", "password": "SecurePass1", "full_name": "Jane Doe"}]}}


class SignupResponse(BaseModel):
    message: str
    cognito_sub: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    confirmation_code: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    id_token: str
    token_type: str = "Bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    id_token: str
    token_type: str = "Bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    confirmation_code: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
