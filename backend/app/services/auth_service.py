"""Business logic service for user registration, authentication, and session handling."""

from datetime import timedelta
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.schemas.user import UserResponse

logger = logging.getLogger("farm-management.auth")


class AuthService:
    """Authentication and identity service managing credential verification and token issue."""

    @staticmethod
    def register_user(db: Session, data: UserRegister) -> tuple[User, TokenResponse]:
        """Register a new user account with hashed password credentials.
        
        Args:
            db: Active SQLAlchemy database session.
            data: Validated registration payload.
            
        Returns:
            Tuple of (created User model, TokenResponse with bearer token and safe profile).
            
        Raises:
            HTTPException(400): If email is already in use.
        """
        normalized_email = data.email.strip().lower()

        # Check for existing user with same email (case-insensitive)
        existing = db.query(User).filter(User.email == normalized_email).first()
        if existing:
            logger.warning(f"Registration attempted with existing email: {normalized_email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in.",
            )

        # Hash password securely using bcrypt
        password_hash = hash_password(data.password)

        # Create new User database entity
        new_user = User(
            name=data.name.strip(),
            email=normalized_email,
            password_hash=password_hash,
            phone=data.phone.strip() if data.phone else None,
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"Successfully registered new user: {new_user.id} ({normalized_email})")

        # Generate immediate access token so the user is authenticated on signup
        token_response = AuthService.build_token_response(new_user)
        return new_user, token_response

    @staticmethod
    def authenticate_user(db: Session, data: UserLogin) -> tuple[User, TokenResponse]:
        """Authenticate user by email and password, returning a new bearer session token.
        
        Args:
            db: Active SQLAlchemy database session.
            data: Validated login credentials.
            
        Returns:
            Tuple of (authenticated User model, TokenResponse).
            
        Raises:
            HTTPException(401): If credentials do not match or user does not exist.
        """
        normalized_email = data.email.strip().lower()

        user = db.query(User).filter(User.email == normalized_email).first()
        if not user or not verify_password(data.password, user.password_hash):
            logger.warning(f"Failed authentication attempt for email: {normalized_email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email address or password. Please verify your credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info(f"User authenticated successfully: {user.id} ({normalized_email})")
        token_response = AuthService.build_token_response(user)
        return user, token_response

    @staticmethod
    def build_token_response(user: User) -> TokenResponse:
        """Construct a standardized TokenResponse for an authenticated user."""
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(user.id),
            email=user.email,
            expires_delta=expires_delta,
        )

        user_response = UserResponse.model_validate(user)
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=int(expires_delta.total_seconds()),
            user=user_response,
        )


auth_service = AuthService()
