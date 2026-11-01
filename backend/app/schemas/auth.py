"""Authentication Pydantic schemas for request validation and response serialization."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.user import UserResponse


class UserRegister(BaseModel):
    """Payload schema for user registration."""
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of the user",
        examples=["Sarah Jenkins"],
    )
    email: EmailStr = Field(
        ...,
        description="Valid, unique email address",
        examples=["sarah.jenkins@farm.local"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password (minimum 8 characters)",
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Optional contact phone number",
        examples=["+1 (555) 234-5678"],
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email address to lowercase and strip whitespace."""
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Strip whitespace and verify name is not only blank spaces."""
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return cleaned


class UserLogin(BaseModel):
    """Payload schema for authenticating existing users."""
    email: EmailStr = Field(
        ...,
        description="Registered email address",
        examples=["sarah.jenkins@farm.local"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Account password",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email address to lowercase and strip whitespace."""
        if isinstance(v, str):
            return v.strip().lower()
        return v


class TokenResponse(BaseModel):
    """Authentication token response payload with user context."""
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token scheme identifier")
    expires_in: int = Field(..., description="Access token lifetime in seconds")
    user: UserResponse = Field(..., description="Authenticated user profile details")


class LogoutResponse(BaseModel):
    """Response payload for session revocation / logout acknowledgment."""
    message: str = Field(default="Successfully logged out")
