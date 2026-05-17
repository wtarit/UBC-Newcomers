# UBC Newcomers

Community app for UBC newcomers to find events, meet people, and build connections.

## Architecture

- **Backend**: Python FastAPI in `backend/` — async SQLAlchemy + asyncpg
- **Frontend**: React Native (Expo SDK 54) in `frontend/` — Expo Router + Zustand
- **Database**: PostgreSQL 17.4 on AWS RDS
- **AI**: AWS Bedrock (Claude Sonnet 4.6) for user/event matching

## AWS Resources (us-west-2)

All resource IDs (RDS host, Cognito pool/client, S3 bucket, ALB, etc.) are in `backend/.env`. Frontend env is in `frontend/.env`. See respective `.env.example` files for the full list.

## Dev Setup

### Backend
```bash
cd backend
uv sync
cp .env.example .env  # fill in values
uv run fastapi dev main.py
```

Swagger docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npx expo start
```

Runs on iOS/Android (react-native-maps) and web (styled map fallback).

## Project Structure

```
backend/
├── main.py              # FastAPI app, lifespan, CORS, router wiring
├── Dockerfile           # ECS Fargate deployment
├── app/
│   ├── config.py        # Pydantic settings from .env
│   ├── database.py      # Async SQLAlchemy engine + session
│   ├── dependencies.py  # get_current_user (Cognito token → User)
│   ├── seed.py          # UBC landmark seed data
│   ├── models/          # SQLAlchemy ORM: User, Event, Connection, Landmark, Meetup
│   ├── schemas/         # Pydantic request/response models (auto Swagger docs)
│   ├── routers/         # auth, users, events, connections, matching, landmarks, meetups
│   └── services/        # cognito, s3, bedrock, sns, scraper
└── tests/               # pytest async test suite

frontend/
├── app/
│   ├── _layout.tsx          # Root layout (fonts, theme, Stack navigator)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Bottom tabs: Explore, Nearby, Profile
│   │   ├── index.tsx        # Explore tab — full-screen campus map with zone markers
│   │   ├── nearby.tsx       # Nearby tab — proximity-based user discovery
│   │   └── profile.tsx      # Profile tab — stats, progress, account info
│   ├── zone-detail.tsx      # Modal — zone details when marker tapped
│   └── user-detail.tsx      # Modal — nearby user details
├── components/
│   ├── map/                 # Platform-specific map (native + web fallback)
│   └── ui/                  # Button, Card, MatchBadge, ProgressRing
├── services/
│   └── api.ts               # Typed API client (auth, users, events, matching, etc.)
├── stores/
│   ├── useAuthStore.ts      # Auth state (login, signup, token refresh)
│   ├── useExploreStore.ts   # Zone unlock/progress + landmarks from API
│   └── useNearbyStore.ts    # Nearby/matched users from API, connections
└── constants/
    ├── Colors.ts            # Design tokens (Brand, Surfaces, Typography, Spacing)
    ├── Zones.ts             # 12 UBC campus zones with lat/lng + categories
    └── MockUsers.ts         # Mock nearby users + AI intro templates
```

## Key Patterns

### Backend
- All Pydantic models use `model_config = {"from_attributes": True}` for ORM compatibility
- AWS clients use `@lru_cache` lazy init (not module-level) to avoid import-time credential issues
- Email validation: only `*.ubc.ca` emails allowed; `test_allowed_emails` in config for test accounts
- Profile pictures: S3 presigned URLs (upload + download), key stored in DB
- Location: lat/lng floats with haversine distance calc (no PostGIS dependency)
- Matching: Bedrock Claude Sonnet 4.6 scores users/events and returns JSON

### Frontend
- Expo Router file-based routing with typed routes enabled
- Zustand for state management (no Redux)
- Platform-specific components via `.native.tsx` / `.tsx` suffixes (e.g., ExploreMap)
- Design system: Plus Jakarta Sans (headings), DM Sans (body), Fira Code (monospace)
- Color theme: Calm Blue (`#007AFF` accent) on white, minimal shadows
- API client in `services/api.ts` — typed fetch wrapper with auto token refresh
- Auth store (`stores/useAuthStore.ts`) wraps Cognito login/signup/refresh via backend
- `EXPO_PUBLIC_API_URL` env var points to the ALB (defaults to production)
- Zone categories: nature, academic, social, culture, athletics (color-coded)
- Gamification: zone unlock points, exploration progress tracking

## Testing

```bash
cd backend
uv run pytest tests/ -v
```

Test accounts are allowlisted via `test_allowed_emails` in config.

## Deployment

Docker image pushed to ECR, runs on ECS Fargate behind ALB. See `.env` for ECR URI, ALB hostname, and ECS cluster/service names.

```bash
# Build and push (substitute values from .env)
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
docker build -t ubc-newcomers-backend backend/
docker tag ubc-newcomers-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/ubc-newcomers-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/ubc-newcomers-backend:latest
# Force new deployment
aws ecs update-service --cluster ubc-newcomers-cluster --service ubc-newcomers-backend --force-new-deployment
```

## DB Credentials

All in `.env` (not committed).
