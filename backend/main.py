from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, users, events, connections, matching, landmarks, meetups
from app.seed import seed_landmarks


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from app.database import async_session
    async with async_session() as db:
        await seed_landmarks(db)
    yield
    await engine.dispose()


app = FastAPI(
    title="UBC Newcomers API",
    description="Backend API for UBC Newcomers community app — connecting new UBC students",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(connections.router)
app.include_router(matching.router)
app.include_router(landmarks.router)
app.include_router(meetups.router)


@app.get("/", tags=["Health"])
async def health():
    return {"status": "ok", "app": "UBC Newcomers API"}
