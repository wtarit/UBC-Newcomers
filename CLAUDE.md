# UBC Newcomers

Community app for UBC newcomers to find events, meet people, and build connections. Built for AWS Hackathon.

## Architecture

- **Backend**: Python FastAPI in `backend/` — async SQLAlchemy + asyncpg
- **Frontend**: React Native mobile app (separate repo/team)
- **Database**: PostgreSQL 17.4 on AWS RDS
- **AI**: AWS Bedrock (Claude Sonnet 4.6) for user/event matching

## AWS Resources (us-west-2)

| Resource | ID |
|---|---|
| RDS PostgreSQL | `ubc-newcomers-db.c7xpjgqlgevo.us-west-2.rds.amazonaws.com` |
| Cognito User Pool | `us-west-2_Cb7YyLReb` |
| Cognito App Client | `7qnnl3dtml6c1p7u41upjarc1b` |
| S3 (profile pics) | `ubc-newcomers-profile-pics-840765342118` |
| Security Group | `sg-033d0cba6c3d91a42` |
| ECR Repository | `ubc-newcomers-backend` |
| ECS Cluster | `ubc-newcomers-cluster` |
| ECS Service | `ubc-newcomers-backend` |
| ALB | `ubc-newcomers-alb-2075450770.us-west-2.elb.amazonaws.com` |
| Task Execution Role | `ecsTaskExecutionRole` |
| Task Role | `ubc-newcomers-task-role` |

## Dev Setup

```bash
cd backend
uv sync
cp .env.example .env  # fill in values
uv run fastapi dev main.py
```

Swagger docs: http://localhost:8000/docs

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
```

## Key Patterns

- All Pydantic models use `model_config = {"from_attributes": True}` for ORM compatibility
- AWS clients use `@lru_cache` lazy init (not module-level) to avoid import-time credential issues
- Email validation: only `*.ubc.ca` emails allowed; `test_allowed_emails` in config for test accounts
- Profile pictures: S3 presigned URLs (upload + download), key stored in DB
- Location: lat/lng floats with haversine distance calc (no PostGIS dependency)
- Matching: Bedrock Claude Sonnet 4.6 scores users/events and returns JSON

## Testing

```bash
cd backend
uv run pytest tests/ -v
```

Test account `tarit.witworrasakul@gmail.com` is allowlisted in `test_allowed_emails` for integration tests.

## Deployment

Docker image pushed to ECR, runs on ECS Fargate behind ALB.

Live API: `http://ubc-newcomers-alb-2075450770.us-west-2.elb.amazonaws.com`
Swagger docs: `http://ubc-newcomers-alb-2075450770.us-west-2.elb.amazonaws.com/docs`

```bash
# Build and push
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 840765342118.dkr.ecr.us-west-2.amazonaws.com
docker build -t ubc-newcomers-backend backend/
docker tag ubc-newcomers-backend:latest 840765342118.dkr.ecr.us-west-2.amazonaws.com/ubc-newcomers-backend:latest
docker push 840765342118.dkr.ecr.us-west-2.amazonaws.com/ubc-newcomers-backend:latest
# Force new deployment
aws ecs update-service --cluster ubc-newcomers-cluster --service ubc-newcomers-backend --force-new-deployment
```

## DB Credentials

- User: `ubcadmin`
- Password: in `.env` (not committed)
- DB name: `ubcnewcomers`
