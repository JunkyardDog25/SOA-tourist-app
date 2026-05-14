package com.soa.authService.configuration;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.soa.authService.grpc.UserGrpcServiceImpl;

import io.grpc.Server;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class GrpcServerConfig {

    @Value("${grpc.server.port:9090}")
    private int grpcPort;

    private final UserGrpcServiceImpl userGrpcService;

    private Server server;

    @EventListener(ContextRefreshedEvent.class)
    public void start() throws IOException {
        if (server == null) {
            server = NettyServerBuilder.forPort(grpcPort)
                    .addService(userGrpcService)
                    .build()
                    .start();
        }
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.shutdown();
        }
    }
}
