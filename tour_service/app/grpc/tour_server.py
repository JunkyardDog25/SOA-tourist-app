from datetime import datetime

import grpc
from fastapi import HTTPException

from app.grpc.generated import tour_pb2, tour_pb2_grpc
from app.services import tour_service, purchase_service


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


def _keypoint_to_proto(keypoint: dict | None) -> tour_pb2.Keypoint | None:
    if not keypoint:
        return None
    return tour_pb2.Keypoint(
        id=str(keypoint.get("id", "")),
        name=str(keypoint.get("name", "")),
        description=str(keypoint.get("description", "")),
        latitude=float(keypoint.get("latitude", 0.0)),
        longitude=float(keypoint.get("longitude", 0.0)),
        image_url=str(keypoint.get("image_url", "")),
    )


def _duration_to_proto(duration: dict) -> tour_pb2.TourDuration:
    return tour_pb2.TourDuration(
        transport_type=str(duration.get("transport_type", "")),
        minutes=int(duration.get("minutes", 0)),
    )


def _keypoints_to_proto(keypoints: list[dict]) -> list[tour_pb2.Keypoint]:
    return [
        keypoint
        for keypoint in (_keypoint_to_proto(item) for item in keypoints)
        if keypoint is not None
    ]


def _set_optional_string(message, field_name: str, value) -> None:
    value = _datetime_to_string(value)
    if value is not None:
        setattr(message, field_name, value)


def _public_tour_to_proto(tour: dict) -> tour_pb2.TourPublic:
    response = tour_pb2.TourPublic(
        id=str(tour.get("id", "")),
        author_id=str(tour.get("author_id", "")),
        title=str(tour.get("title", "")),
        description=str(tour.get("description", "")),
        difficulty=str(tour.get("difficulty", "")),
        tags=[str(tag) for tag in tour.get("tags", [])],
        status=str(tour.get("status", "")),
        price=float(tour.get("price", 0.0)),
        distance_km=float(tour.get("distance_km", 0.0)),
        durations=[
            _duration_to_proto(duration) for duration in tour.get("durations", [])
        ],
    )
    first_keypoint = _keypoint_to_proto(tour.get("first_keypoint"))
    if first_keypoint is not None:
        response.first_keypoint.CopyFrom(first_keypoint)
    _set_optional_string(response, "published_at", tour.get("published_at"))
    return response


def _full_tour_to_proto(tour: dict) -> tour_pb2.TourFull:
    response = tour_pb2.TourFull(
        id=str(tour.get("id", "")),
        author_id=str(tour.get("author_id", "")),
        title=str(tour.get("title", "")),
        description=str(tour.get("description", "")),
        difficulty=str(tour.get("difficulty", "")),
        tags=[str(tag) for tag in tour.get("tags", [])],
        status=str(tour.get("status", "")),
        price=float(tour.get("price", 0.0)),
        distance_km=float(tour.get("distance_km", 0.0)),
        durations=[
            _duration_to_proto(duration) for duration in tour.get("durations", [])
        ],
        keypoints=_keypoints_to_proto(tour.get("keypoints", [])),
        created_at=_datetime_to_string(tour.get("created_at")) or "",
        updated_at=_datetime_to_string(tour.get("updated_at")) or "",
    )
    _set_optional_string(response, "published_at", tour.get("published_at"))
    _set_optional_string(response, "archived_at", tour.get("archived_at"))
    return response


class TourQueryService(tour_pb2_grpc.TourQueryServiceServicer):
    async def GetPublishedTours(self, request, context):
        if not request.user_id:
            await context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Missing authenticated user",
            )

        try:
            tours = await tour_service.get_all_published_tours()
            return tour_pb2.TourListResponse(
                tours=[_public_tour_to_proto(tour) for tour in tours]
            )
        except HTTPException as exc:
            await context.abort(
                _grpc_status_from_http(exc.status_code),
                str(exc.detail),
            )

    async def GetTourById(self, request, context):
        if not request.user_id:
            await context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Missing authenticated user",
            )

        try:
            tour = await tour_service.get_tour_by_id(request.tour_id)
            is_owner_or_admin = (
                tour["author_id"] == request.user_id or "ROLE_ADMIN" in request.roles
            )
            if tour["status"] != "published" and not is_owner_or_admin:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "You do not have access to this tour",
                )

            if is_owner_or_admin:
                return tour_pb2.TourDetailsResponse(
                    public_view=False,
                    full_tour=_full_tour_to_proto(tour),
                )

            # Tourist: check if tour is purchased → reveal all keypoints
            if "ROLE_TOURIST" in request.roles:
                purchased = await purchase_service.has_purchased_tour(
                    request.user_id, request.tour_id
                )
                if purchased:
                    return tour_pb2.TourDetailsResponse(
                        public_view=False,
                        full_tour=_full_tour_to_proto(tour),
                    )

            public_tour = tour_service.get_public_tour_response(tour)
            return tour_pb2.TourDetailsResponse(
                public_view=True,
                public_tour=_public_tour_to_proto(public_tour),
            )
        except HTTPException as exc:
            await context.abort(
                _grpc_status_from_http(exc.status_code),
                str(exc.detail),
            )


async def start_grpc_server(port: int) -> grpc.aio.Server:
    server = grpc.aio.server()
    tour_pb2_grpc.add_TourQueryServiceServicer_to_server(TourQueryService(), server)
    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    print(f"Tour gRPC server started on port {port}")
    return server
