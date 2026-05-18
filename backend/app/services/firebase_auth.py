import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException

from app.config import settings

_app = None


def _get_app():
    global _app
    if _app is not None:
        return _app

    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        _app = firebase_admin.initialize_app(cred)
    else:
        _app = firebase_admin.initialize_app(
            options={"projectId": settings.firebase_project_id}
        )
    return _app


def verify_id_token(id_token: str) -> dict:
    _get_app()
    try:
        decoded = auth.verify_id_token(id_token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email", ""),
            "name": decoded.get("name", ""),
            "email_verified": decoded.get("email_verified", False),
        }
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


def get_or_create_firebase_user(email: str) -> str:
    _get_app()
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, email_verified=True)
        return user.uid
    except auth.UserNotFoundError:
        user = auth.create_user(email=email, email_verified=True)
        return user.uid


def create_custom_token(uid: str) -> str:
    _get_app()
    token = auth.create_custom_token(uid)
    return token.decode("utf-8") if isinstance(token, bytes) else token
