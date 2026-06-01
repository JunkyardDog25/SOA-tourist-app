import httpx

from app.config import settings
from app.models.execution_saga import (
    ExecutionRecordResponse,
    RecordExecutionCompleteRequest,
    RecordExecutionStartRequest,
)


async def record_execution_start(request: RecordExecutionStartRequest) -> ExecutionRecordResponse:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/executions/start",
            json=request.model_dump(by_alias=True),
        )
        resp.raise_for_status()
        return ExecutionRecordResponse.model_validate(resp.json())


async def delete_execution_record(saga_id: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/executions/record/{saga_id}",
        )
        resp.raise_for_status()


async def record_execution_complete(request: RecordExecutionCompleteRequest) -> ExecutionRecordResponse:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/executions/complete",
            json=request.model_dump(by_alias=True),
        )
        resp.raise_for_status()
        return ExecutionRecordResponse.model_validate(resp.json())


async def revert_execution_complete(request: RecordExecutionCompleteRequest) -> ExecutionRecordResponse:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/executions/complete/revert",
            json=request.model_dump(by_alias=True),
        )
        resp.raise_for_status()
        return ExecutionRecordResponse.model_validate(resp.json())
