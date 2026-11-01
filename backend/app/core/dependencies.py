"""Reusable FastAPI request dependencies for authentication and database sessions."""

import uuid
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.user import User

# OAuth2 scheme configured for OpenAPI Swagger documentation
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/auth/login",
    auto_error=False,
)


def extract_token_from_request(
    request: Request,
    auth_header_token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[str]:
    """Extract bearer token from Authorization header or fallback to cookie."""
    if auth_header_token:
        return auth_header_token

    # Fallback to Authorization header manual parsing if needed
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    # Fallback to HTTP-only cookie if stored there
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    return None


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(extract_token_from_request),
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and retrieve the currently authenticated user entity.
    
    In local development mode, allows direct access for the frontend demo
    without exposing credentials, while preserving full production security enforcement.
    
    Raises:
        HTTPException(401): If token is missing, invalid, expired, or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        # In local development mode, allow direct demo access when header is present
        # This allows direct access to the dashboard without a login screen during development/demos,
        # while keeping production authentication and unit test security isolation 100% intact.
        if settings.ENVIRONMENT.lower() == "development" and (
            request.headers.get("X-Local-Demo") == "true" or getattr(settings, "ENABLE_DEMO_AUTO_AUTH", False)
        ):
            dev_user = db.query(User).first()
            if dev_user:
                return dev_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        if settings.ENVIRONMENT.lower() == "development" and request.headers.get("X-Local-Demo") == "true":
            dev_user = db.query(User).first()
            if dev_user:
                return dev_user
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        if settings.ENVIRONMENT.lower() == "development" and request.headers.get("X-Local-Demo") == "true":
            dev_user = db.query(User).first()
            if dev_user:
                return dev_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token was not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_current_user(
    request: Request,
    token: Optional[str] = Depends(extract_token_from_request),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Retrieve current user if authenticated, without failing if unauthenticated."""
    if not token:
        if settings.ENVIRONMENT.lower() == "development" and (
            request.headers.get("X-Local-Demo") == "true" or getattr(settings, "ENABLE_DEMO_AUTO_AUTH", False)
        ):
            return db.query(User).first()
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_uuid = uuid.UUID(user_id_str)
        return db.query(User).filter(User.id == user_uuid).first()
    except (ValueError, TypeError):
        return None
