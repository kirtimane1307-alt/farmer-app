"""Common Pydantic models and API response envelopes."""

from typing import Generic, Optional, TypeVar, Any, List
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    """Detailed error object representation."""
    code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable error explanation")
    details: Optional[Any] = Field(None, description="Optional extra error context or validation errors")


class BaseResponse(BaseModel):
    """Base response contract."""
    success: bool = Field(..., description="Indicates if the operation succeeded")


class SuccessResponse(BaseResponse, Generic[DataT]):
    """Standard generic success response envelope."""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[DataT] = None


class ErrorResponse(BaseResponse):
    """Standard error response envelope."""
    success: bool = False
    error: ErrorDetail


class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = "healthy"
    project_name: str
    version: str
    environment: str
    database: str = Field(default="disconnected", description="Status of the database connection ('connected' or 'disconnected')")
    database_connected: bool = False


class DatabasePingResponse(BaseModel):
    """Database probe and telemetry response."""
    database: str
    connected: bool
    latency_ms: float
    tables_registered: List[str] = Field(default_factory=list)
