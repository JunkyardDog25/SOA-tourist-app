from datetime import datetime

import grpc

from app.grpc.generated import tour_pb2, tour_pb2_grpc
from app.models.tour_execution import StartTourExecutionRequest
from app.services import execution_saga_service, tour_execution_service


def _grpc_status_from_http(status_code: int) -> grpc.StatusCode:
    if status_code == 400:
        return grpc.StatusCode.INVALID_ARGUMENT
    if status_code == 401:
        return grpc.StatusCode.UNAUTHENTICATED
    if status_code == 403:
        return grpc.StatusCode.PERMISSION_DENIED
    if status_code == 404:
        return grpc.StatusCode.NOT_FOUND
    if status_code == 409:
        return grpc.StatusCode.ALREADY_EXISTS
    return grpc.StatusCode.INTERNAL


def _datetime_to_string(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _execution_to_proto(execution) -> tour_pb2.TourExecutionMessage:
    msg = tour_pb2.TourExecutionMessage(
        id=execution.id,
        tour_id=execution.tour_id,
        tourist_id=execution.tourist_id,
        status=execution.status.value,
        started_at=_datetime_to_string(execution.started_at),
        last_activity_at=_datetime_to_string(execution.last_activity_at),
        start_latitude=execution.start_latitude,
        start_longitude=execution.start_longitude,
    )
    if execution.completed_at:
        msg.completed_at = _datetime_to_string(execution.completed_at)
    if execution.abandoned_at:
        msg.abandoned_at = _datetime_to_string(execution.abandoned_at)
    if execution.saga_id:
        msg.saga_id = execution.saga_id
    for visited in execution.visited_keypoints:
        msg.visited_keypoints.append(
            tour_pb2.VisitedKeypointMessage(
                keypoint_id=visited.keypoint_id,
                visited_at=_datetime_to_string(visited.visited_at),
            )
        )
    return msg


class TourExecutionGrpcService(tour_pb2_grpc.TourExecutionServiceServicer):
    async def StartExecution(self, request, context):
        try:
            execution = await execution_saga_service.start_execution_with_saga(
                request.tour_id,
                request.tourist_id,
                StartTourExecutionRequest(
                    latitude=request.latitude,
                    longitude=request.longitude,
                ),
            )
            return _execution_to_proto(execution)
        except Exception as exc:
            from fastapi import HTTPException

            if isinstance(exc, HTTPException):
                detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
                await context.abort(
                    _grpc_status_from_http(exc.status_code),
                    detail=detail,
                )
            await context.abort(grpc.StatusCode.INTERNAL, detail=str(exc))

    async def GetActiveExecution(self, request, context):
        execution = await tour_execution_service.get_active_execution_for_tourist(
            request.tourist_id
        )
        if execution is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, detail="No active execution")
        return _execution_to_proto(execution)


def register_execution_service(server) -> None:
    tour_pb2_grpc.add_TourExecutionServiceServicer_to_server(
        TourExecutionGrpcService(), server
    )
