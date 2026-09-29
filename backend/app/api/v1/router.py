from fastapi import APIRouter, Depends

from app.api.deps import protected
from app.api.v1.routes import auth, core, farm_log, fields, hardware, ingest, intelligence

api_router = APIRouter()

# Authentication is public by definition.
api_router.include_router(auth.router)

# Everything that exposes farm data sits behind the access token.
guarded = [Depends(protected)]
api_router.include_router(core.router, dependencies=guarded)
api_router.include_router(fields.router, dependencies=guarded)
api_router.include_router(hardware.router, dependencies=guarded)
api_router.include_router(intelligence.router, dependencies=guarded)
api_router.include_router(farm_log.router, dependencies=guarded)

# Field nodes authenticate with a device key rather than a user session.
api_router.include_router(ingest.router)
