from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class DomainError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "domain_error"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class NotFoundError(DomainError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} '{identifier}' was not found.", 404, "not_found")


def _problem(status: int, code: str, title: str, detail: str, path: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": f"about:blank#{code}", "title": title, "status": status,
                 "detail": detail, "instance": path},
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(request: Request, exc: DomainError):
        return _problem(exc.status_code, exc.code, exc.code.replace("_", " ").title(),
                        exc.message, request.url.path)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return _problem(exc.status_code, "http_error", "Request failed",
                        str(exc.detail), request.url.path)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        return _problem(422, "validation_error", "Invalid request",
                        "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}"
                                  for e in exc.errors()), request.url.path)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        return _problem(500, "internal_error", "Internal server error",
                        "An unexpected error occurred.", request.url.path)
