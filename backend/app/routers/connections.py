import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.connection import Connection
from app.models.user import User
from app.schemas.connection import ConnectionListResponse, ConnectionResponse

router = APIRouter(prefix="/connections", tags=["Connections"])


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
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
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
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
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
