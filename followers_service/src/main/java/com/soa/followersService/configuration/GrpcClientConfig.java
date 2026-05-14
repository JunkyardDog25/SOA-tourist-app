package com.soa.followersService.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.soa.grpc.UserServiceGrpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;

@Configuration
public class GrpcClientConfig {

    @Value("${grpc.client.auth-service.host:auth-service}")
    private String authServiceHost;

    @Value("${grpc.client.auth-service.port:9090}")
    private int authServicePort;

    @Bean
    public ManagedChannel authServiceChannel() {
        return ManagedChannelBuilder.forAddress(authServiceHost, authServicePort)
                .usePlaintext()
                .build();
    }

    @Bean
    public UserServiceGrpc.UserServiceBlockingStub userServiceStub(ManagedChannel authServiceChannel) {
        return UserServiceGrpc.newBlockingStub(authServiceChannel);
    }
}
