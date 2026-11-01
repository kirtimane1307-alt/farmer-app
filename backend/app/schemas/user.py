"""User Pydantic schemas for request validation and response serialization."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    """Shared user properties."""
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Unique email address")
    phone: Optional[str] = Field(None, max_length=20, description="Primary contact phone number")


class UserCreate(UserBase):
    """Schema for registering a new user with password."""
    password: str = Field(..., min_length=8, max_length=128, description="Plaintext password to be hashed")


class UserUpdate(BaseModel):
    """Schema for updating user profile fields."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class UserResponse(UserBase):
    """Schema for user responses without sensitive credentials."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
