import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.connection import Connection
from app.models.connection_message import ConnectionMessage
from app.models.user import User
from app.schemas.connection import (
    ConnectionListResponse,
    ConnectionLocationBriefResponse,
    ConnectionLocationPairResponse,
    ConnectionLocationResponse,
    ConnectionLocationsListResponse,
    ConnectionMessageListResponse,
    ConnectionMessageResponse,
    ConnectionResponse,
    CreateConnectionMessageRequest,
)

router = APIRouter(prefix="/connections", tags=["Connections"])


async def _get_connection_for_user(
    connection_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Connection:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    if current_user.id not in (connection.requester_id, connection.receiver_id):
        raise HTTPException(status_code=403, detail="Not part of this connection")
    return connection


@router.post("/request/{user_id}", response_model=ConnectionResponse)
async def send_connection_request(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")

    target = await db.execute(select(User).where(User.id == user_id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Connection).where(
            or_(
                (Connection.requester_id == current_user.id) & (Connection.receiver_id == user_id),
                (Connection.requester_id == user_id) & (Connection.receiver_id == current_user.id),
            ),
            Connection.status.in_(["pending", "accepted"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Connection already exists")

    connection = Connection(requester_id=current_user.id, receiver_id=user_id)
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    return ConnectionResponse.model_validate(connection)


@router.put("/{connection_id}/accept", response_model=ConnectionResponse)
async def accept_connection(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the receiver can accept")
    if connection.status != "pending":
        raise HTTPException(status_code=400, detail="Connection is not pending")

    connection.status = "accepted"

    requester = await db.execute(select(User).where(User.id == connection.requester_id))
    req_user = requester.scalar_one()
    req_user.connections_count += 1
    current_user.connections_count += 1

    await db.commit()
    await db.refresh(connection)
    return ConnectionResponse.model_validate(connection)


@router.put("/{connection_id}/decline", response_model=ConnectionResponse)
async def decline_connection(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the receiver can decline")

    connection.status = "declined"
    await db.commit()
    await db.refresh(connection)
    return ConnectionResponse.model_validate(connection)


@router.get("", response_model=ConnectionListResponse)
async def list_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connection).where(
            or_(Connection.requester_id == current_user.id, Connection.receiver_id == current_user.id),
            Connection.status == "accepted",
        )
    )
    connections = result.scalars().all()
    return ConnectionListResponse(
        connections=[ConnectionResponse.model_validate(c) for c in connections],
        total=len(connections),
    )


@router.get("/locations", response_model=ConnectionLocationsListResponse)
async def list_connection_locations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connection).where(
            or_(Connection.requester_id == current_user.id, Connection.receiver_id == current_user.id),
            Connection.status == "accepted",
        )
    )
    connections = result.scalars().all()

    locations = []
    for conn in connections:
        other_id = conn.receiver_id if conn.requester_id == current_user.id else conn.requester_id
        user_result = await db.execute(select(User).where(User.id == other_id))
        other_user = user_result.scalar_one()
        locations.append(
            ConnectionLocationResponse(
                id=other_user.id,
                full_name=other_user.full_name,
                major=other_user.major,
                origin=other_user.origin,
                interests=other_user.interests,
                profile_picture_url=None,
                is_available_to_meet=other_user.is_available_to_meet,
                latitude=other_user.last_latitude,
                longitude=other_user.last_longitude,
                connected_at=conn.created_at,
            )
        )

    return ConnectionLocationsListResponse(connections=locations, total=len(locations))


@router.get("/pending", response_model=ConnectionListResponse)
async def list_pending(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connection).where(Connection.receiver_id == current_user.id, Connection.status == "pending")
    )
    connections = result.scalars().all()
    return ConnectionListResponse(
        connections=[ConnectionResponse.model_validate(c) for c in connections],
        total=len(connections),
    )


@router.get("/{connection_id}/location", response_model=ConnectionLocationPairResponse)
async def get_connection_locations(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.status != "accepted":
        raise HTTPException(status_code=400, detail="Connection must be accepted")

    other = connection.receiver if connection.requester_id == current_user.id else connection.requester
    me = connection.requester if connection.requester_id == current_user.id else connection.receiver
    return ConnectionLocationPairResponse(
        mine=ConnectionLocationBriefResponse(
            user_id=me.id,
            full_name=me.full_name,
            latitude=me.last_latitude,
            longitude=me.last_longitude,
            last_active_at=me.last_active_at,
        ),
        theirs=ConnectionLocationBriefResponse(
            user_id=other.id,
            full_name=other.full_name,
            latitude=other.last_latitude,
            longitude=other.last_longitude,
            last_active_at=other.last_active_at,
        ),
    )


@router.post("/{connection_id}/messages", response_model=ConnectionMessageResponse)
async def send_message(
    connection_id: uuid.UUID,
    body: CreateConnectionMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.status != "accepted":
        raise HTTPException(status_code=400, detail="Connection must be accepted")

    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    message = ConnectionMessage(connection_id=connection.id, sender_id=current_user.id, body=text)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return ConnectionMessageResponse.model_validate(message)


@router.get("/{connection_id}/messages", response_model=ConnectionMessageListResponse)
async def list_messages(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.status != "accepted":
        raise HTTPException(status_code=400, detail="Connection must be accepted")

    result = await db.execute(
        select(ConnectionMessage)
        .where(ConnectionMessage.connection_id == connection.id)
        .order_by(ConnectionMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return ConnectionMessageListResponse(
        messages=[ConnectionMessageResponse.model_validate(m) for m in messages],
        total=len(messages),
    )


@router.put("/{connection_id}/met", response_model=ConnectionResponse)
async def mark_met(
    connection_id: uuid.UUID,
    landmark_name: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connection = await _get_connection_for_user(connection_id, current_user, db)
    if connection.status != "accepted":
        raise HTTPException(status_code=400, detail="Connection must be accepted")
    connection.met_at_landmark = landmark_name or "UBC Campus"
    await db.commit()
    await db.refresh(connection)
    return ConnectionResponse.model_validate(connection)
