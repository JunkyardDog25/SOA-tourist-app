package com.soa.followersService.grpc;

import com.soa.grpc.follow.FollowRequest;
import com.soa.grpc.follow.FollowResponse;
import com.soa.grpc.follow.FollowServiceGrpc;
import com.soa.followersService.services.FollowService;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class FollowGrpcServiceImpl extends FollowServiceGrpc.FollowServiceImplBase {

    private final FollowService followService;

    @Override
    public void follow(FollowRequest request, StreamObserver<FollowResponse> responseObserver) {
        String followerId = request.getFollowerId();
        String followeeId = request.getFolloweeId();

        log.info("gRPC Follow: followerId={} followeeId={}", followerId, followeeId);

        try {
            followService.follow(followerId, followeeId);
            responseObserver.onNext(FollowResponse.newBuilder()
                    .setSuccess(true)
                    .setMessage("Successfully followed user.")
                    .build());
            responseObserver.onCompleted();
        } catch (IllegalArgumentException e) {
            log.warn("gRPC Follow invalid argument: {}", e.getMessage());
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (IllegalStateException e) {
            log.warn("gRPC Follow already exists: {}", e.getMessage());
            responseObserver.onError(Status.ALREADY_EXISTS
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (Exception e) {
            log.error("gRPC Follow unexpected error", e);
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Internal server error: " + e.getMessage())
                    .asRuntimeException());
        }
    }
}
