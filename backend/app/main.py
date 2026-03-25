from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.scenarios import router as scenarios_router
from app.api.websocket.sim_ws import router as ws_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: nothing needed for MVP (no DB connection pool yet)
    yield
    # Shutdown


app = FastAPI(
    title="Missile Defense Simulation — Educational Platform",
    description="Non-operational educational simulation. Fictional systems and parameters only.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")
app.include_router(ws_router)
