"""Authentication API endpoints for user registration, login, profile retrieval, and logout."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, LogoutResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import UserResponse
from app.services.auth_service import auth_service

auth_router = APIRouter()


def _set_auth_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    """Helper to attach secure HTTP-only access token cookie."""
    is_prod = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=max_age_seconds,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Helper to clear authentication cookie."""
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
    )


@auth_router.post(
    "/register",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Creates a new farm owner/manager account with securely hashed credentials and issues an access token.",
)
def register(
    data: UserRegister,
    response: Response,
    db: Session = Depends(get_db),
):
    """Handle user account registration."""
    user, token_response = auth_service.register_user(db, data)
    _set_auth_cookie(response, token_response.access_token, token_response.expires_in)

    return SuccessResponse(
        message="Account created successfully",
        data=token_response,
    )


@auth_router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Authenticate existing user",
    description="Validates email and password, returning an active bearer JWT and setting a secure session cookie.",
)
def login(
    data: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    """Handle user login with credentials."""
    user, token_response = auth_service.authenticate_user(db, data)
    _set_auth_cookie(response, token_response.access_token, token_response.expires_in)

    return SuccessResponse(
        message="Logged in successfully",
        data=token_response,
    )


@auth_router.get(
    "/me",
    response_model=SuccessResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Retrieves the safe authenticated user profile corresponding to the valid bearer token.",
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return authenticated user profile data (never returns password_hash)."""
    return SuccessResponse(
        message="User profile retrieved successfully",
        data=UserResponse.model_validate(current_user),
    )


@auth_router.post(
    "/logout",
    response_model=SuccessResponse[LogoutResponse],
    status_code=status.HTTP_200_OK,
    summary="Sign out and clear session",
    description="Clears browser session cookies and acknowledges logout.",
)
def logout(
    response: Response,
):
    """Handle session termination and clear authentication cookie."""
    _clear_auth_cookie(response)
    return SuccessResponse(
        message="Successfully logged out",
        data=LogoutResponse(message="Session terminated successfully"),
    )
