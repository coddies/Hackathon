from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

class NotFoundError(Exception):
    def __init__(self, detail: str = "Resource not found"):
        self.detail = detail

class ConflictError(Exception):
    def __init__(self, detail: str = "Conflict"):
        self.detail = detail

class ForbiddenError(Exception):
    def __init__(self, detail: str = "Forbidden"):
        self.detail = detail

class UnauthorizedError(Exception):
    def __init__(self, detail: str = "Unauthorized"):
        self.detail = detail

class ValidationFailedError(Exception):
    def __init__(self, detail: str = "Validation failed"):
        self.detail = detail

class InventoryError(Exception):
    def __init__(self, detail: str = "Insufficient inventory"):
        self.detail = detail

class IdempotencyConflictError(Exception):
    def __init__(self, detail: str = "Idempotency key conflict"):
        self.detail = detail

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError):
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": exc.detail})

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(request: Request, exc: ForbiddenError):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": exc.detail})

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(request: Request, exc: UnauthorizedError):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": exc.detail})

    @app.exception_handler(ValidationFailedError)
    async def validation_failed_handler(request: Request, exc: ValidationFailedError):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": exc.detail})

    @app.exception_handler(InventoryError)
    async def inventory_error_handler(request: Request, exc: InventoryError):
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": exc.detail})

    @app.exception_handler(IdempotencyConflictError)
    async def idempotency_conflict_handler(request: Request, exc: IdempotencyConflictError):
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "body": exc.body},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
