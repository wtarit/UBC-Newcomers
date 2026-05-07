import json
from functools import lru_cache

import boto3

from app.config import settings
from app.models.event import Event
from app.models.user import User


@lru_cache
def _client():
    return boto3.client("bedrock-runtime", region_name=settings.aws_region)


def _user_profile_text(user: User) -> str:
    parts = [f"Name: {user.full_name}"]
    if user.major:
        parts.append(f"Major: {user.major}")
    if user.faculty:
        parts.append(f"Faculty: {user.faculty}")
    if user.year_standing:
        parts.append(f"Year: {user.year_standing}")
    if user.origin:
        parts.append(f"From: {user.origin}")
    if user.interests:
        parts.append(f"Interests: {', '.join(user.interests)}")
    if user.transfer_from:
        parts.append(f"Transferred from: {user.transfer_from}")
    if user.bio:
        parts.append(f"Bio: {user.bio}")
    return " | ".join(parts)


def _event_text(event: Event) -> str:
    parts = [f"Title: {event.title}"]
    if event.club_name:
        parts.append(f"Club: {event.club_name}")
    if event.description:
        parts.append(f"Description: {event.description[:200]}")
    if event.location_name:
        parts.append(f"Location: {event.location_name}")
    return " | ".join(parts)


def match_users(current_user: User, candidates: list[User]) -> list[dict]:
    if not candidates:
        return []

    candidate_texts = "\n".join(
        f"[{i}] {_user_profile_text(c)}" for i, c in enumerate(candidates)
    )

    prompt = f"""You are a matching algorithm for a university social app. Given a user profile and candidate profiles, score each candidate on compatibility (0.0 to 1.0) and give a short reason.

Current user: {_user_profile_text(current_user)}

Candidates:
{candidate_texts}

Return a JSON array of objects with "index", "score", and "reason" fields. Sort by score descending. Only include candidates with score > 0.3.
Return ONLY valid JSON, no other text."""

    try:
        response = _client().invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )
        result = json.loads(response["body"].read())
        content = result["content"][0]["text"]

        start = content.find("[")
        end = content.rfind("]") + 1
        if start == -1 or end == 0:
            return []

        matches = json.loads(content[start:end])
        return [
            {
                "user": candidates[m["index"]],
                "score": float(m["score"]),
                "reason": m["reason"],
            }
            for m in matches
            if m["index"] < len(candidates)
        ]
    except Exception:
        return []


def match_events(current_user: User, events: list[Event]) -> list[dict]:
    if not events:
        return []

    event_texts = "\n".join(f"[{i}] {_event_text(e)}" for i, e in enumerate(events))

    prompt = f"""You are a recommendation engine for a university social app. Given a user profile and a list of events, score each event on relevance (0.0 to 1.0) and give a short reason why this user might enjoy it.

User: {_user_profile_text(current_user)}

Events:
{event_texts}

Return a JSON array of objects with "index", "score", and "reason" fields. Sort by score descending. Only include events with score > 0.3.
Return ONLY valid JSON, no other text."""

    try:
        response = _client().invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )
        result = json.loads(response["body"].read())
        content = result["content"][0]["text"]

        start = content.find("[")
        end = content.rfind("]") + 1
        if start == -1 or end == 0:
            return []

        matches = json.loads(content[start:end])
        return [
            {
                "event": events[m["index"]],
                "score": float(m["score"]),
                "reason": m["reason"],
            }
            for m in matches
            if m["index"] < len(events)
        ]
    except Exception:
        return []
