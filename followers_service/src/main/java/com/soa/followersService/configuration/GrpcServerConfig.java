package com.soa.followersService.configuration;

import com.soa.followersService.grpc.FollowGrpcServiceImpl;
import com.soa.followersService.services.FollowService;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

import java.io.IOException;

@Slf4j
@Configuration
public class GrpcServerConfig {

    @Value("${grpc.server.port:9091}")
    private int grpcServerPort;

    private final FollowService followService;
    private Server server;

    public GrpcServerConfig(FollowService followService) {
        this.followService = followService;
    }

    @EventListener(ContextRefreshedEvent.class)
    public void startGrpcServer() throws IOException {
        if (server != null && !server.isShutdown()) {
            return;
        }
        server = ServerBuilder.forPort(grpcServerPort)
                .addService(new FollowGrpcServiceImpl(followService))
                .build()
                .start();
        log.info("gRPC server started on port {}", grpcServerPort);
    }

    @PreDestroy
    public void stopGrpcServer() {
        if (server != null) {
            log.info("Shutting down gRPC server");
            server.shutdown();
        }
    }
}
