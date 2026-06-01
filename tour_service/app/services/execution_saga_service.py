import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from app.database import get_db
from app.models.execution_saga import (
    RecordExecutionCompleteRequest,
    RecordExecutionStartRequest,
)
from app.models.tour_execution import StartTourExecutionRequest, TourExecutionResponse
from app.services import purchase_service_client, tour_execution_service

logger = logging.getLogger(__name__)

SAGA_START = "EXECUTION_START"
SAGA_COMPLETE = "EXECUTION_COMPLETE"
STEP_CREATE_EXECUTION = "STEP_1_CREATE_EXECUTION"
STEP_RECORD_PURCHASE_START = "STEP_2_RECORD_PURCHASE_START"
STEP_COMPLETE_EXECUTION = "STEP_1_COMPLETE_EXECUTION"
STEP_RECORD_PURCHASE_COMPLETE = "STEP_2_RECORD_PURCHASE_COMPLETE"


async def _init_saga_log(saga_id: str, saga_type: str, tourist_id: str, tour_id: str) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "saga_id": saga_id,
        "saga_type": saga_type,
        "tourist_id": tourist_id,
        "tour_id": tour_id,
        "execution_id": None,
        "status": "STARTED",
        "completed_steps": [],
        "failed_step": None,
        "error_message": None,
        "compensation_incomplete": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.execution_saga_logs.insert_one(doc)
    return doc


async def _append_step(saga_id: str, step: str, execution_id: str | None = None) -> None:
    db = get_db()
    update: dict = {
        "$push": {"completed_steps": step},
        "$set": {"updated_at": datetime.now(timezone.utc)},
    }
    if execution_id:
        update["$set"]["execution_id"] = execution_id
    await db.execution_saga_logs.update_one({"saga_id": saga_id}, update)


async def _mark_failed(saga_id: str, failed_step: str, message: str) -> None:
    db = get_db()
    await db.execution_saga_logs.update_one(
        {"saga_id": saga_id},
        {
            "$set": {
                "status": "FAILED",
                "failed_step": failed_step,
                "error_message": message,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


async def _mark_completed(saga_id: str) -> None:
    db = get_db()
    await db.execution_saga_logs.update_one(
        {"saga_id": saga_id},
        {
            "$set": {
                "status": "COMPLETED",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


async def _mark_compensating(saga_id: str) -> None:
    db = get_db()
    await db.execution_saga_logs.update_one(
        {"saga_id": saga_id},
        {
            "$set": {
                "status": "COMPENSATING",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


async def start_execution_with_saga(
    tour_id: str,
    tourist_id: str,
    data: StartTourExecutionRequest,
) -> TourExecutionResponse:
    saga_id = str(uuid.uuid4())
    await _init_saga_log(saga_id, SAGA_START, tourist_id, tour_id)

    execution: TourExecutionResponse | None = None
    try:
        execution = await tour_execution_service.create_execution(
            tour_id, tourist_id, data, saga_id=saga_id
        )
        await _append_step(saga_id, STEP_CREATE_EXECUTION, execution.id)

        await purchase_service_client.record_execution_start(
            RecordExecutionStartRequest(
                saga_id=saga_id,
                execution_id=execution.id,
                tourist_id=tourist_id,
                tour_id=tour_id,
            )
        )
        await _append_step(saga_id, STEP_RECORD_PURCHASE_START, execution.id)
        await _mark_completed(saga_id)
        return execution

    except Exception as exc:
        logger.warning("[%s] Start saga failed: %s", saga_id, exc)
        await _mark_compensating(saga_id)
        if execution:
            try:
                await tour_execution_service.abandon_execution_by_id(
                    execution.id, tourist_id
                )
            except Exception as comp_exc:
                logger.error("[%s] Compensation abandon failed: %s", saga_id, comp_exc)
        try:
            await purchase_service_client.delete_execution_record(saga_id)
        except Exception as comp_exc:
            logger.error("[%s] Compensation delete record failed: %s", saga_id, comp_exc)
        await _mark_failed(saga_id, STEP_RECORD_PURCHASE_START, str(exc))
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail="Failed to start tour execution") from exc


async def complete_execution_with_saga(
    tour_id: str,
    execution_id: str,
    tourist_id: str,
) -> TourExecutionResponse:
    saga_id = str(uuid.uuid4())
    await _init_saga_log(saga_id, SAGA_COMPLETE, tourist_id, tour_id)

    try:
        execution = await tour_execution_service.complete_execution(
            tour_id, execution_id, tourist_id
        )
        await _append_step(saga_id, STEP_COMPLETE_EXECUTION, execution.id)

        await purchase_service_client.record_execution_complete(
            RecordExecutionCompleteRequest(
                saga_id=saga_id,
                execution_id=execution.id,
                tourist_id=tourist_id,
                tour_id=tour_id,
            )
        )
        await _append_step(saga_id, STEP_RECORD_PURCHASE_COMPLETE, execution.id)
        await _mark_completed(saga_id)
        return execution

    except Exception as exc:
        logger.warning("[%s] Complete saga failed: %s", saga_id, exc)
        await _mark_compensating(saga_id)
        try:
            await tour_execution_service.revert_execution_to_active(
                execution_id, tourist_id
            )
        except Exception as comp_exc:
            logger.error("[%s] Compensation revert execution failed: %s", saga_id, comp_exc)
        try:
            await purchase_service_client.revert_execution_complete(
                RecordExecutionCompleteRequest(
                    saga_id=saga_id,
                    execution_id=execution_id,
                    tourist_id=tourist_id,
                    tour_id=tour_id,
                )
            )
        except Exception as comp_exc:
            logger.error("[%s] Compensation revert record failed: %s", saga_id, comp_exc)
        await _mark_failed(saga_id, STEP_RECORD_PURCHASE_COMPLETE, str(exc))
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail="Failed to complete tour execution") from exc
