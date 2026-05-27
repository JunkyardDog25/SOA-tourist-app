package com.soa.authService.grpc;

import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import com.soa.grpc.GetUserByIdRequest;
import com.soa.grpc.GetUserByIdResponse;
import com.soa.grpc.UserServiceGrpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class UserGrpcServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    private final UserRepository userRepository;

    @Override
    public void getUserById(GetUserByIdRequest request, StreamObserver<GetUserByIdResponse> responseObserver) {
        Optional<User> userOpt = userRepository.findById(request.getUserId());

        GetUserByIdResponse response;
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            response = GetUserByIdResponse.newBuilder()
                    .setUserId(user.getId())
                    .setUsername(user.getUsername())
                    .setEmail(user.getEmail())
                    .setRole(user.getRole() != null ? user.getRole().name() : "")
                    .setFound(true)
                    .build();
        } else {
            response = GetUserByIdResponse.newBuilder()
                    .setFound(false)
                    .build();
        }

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
