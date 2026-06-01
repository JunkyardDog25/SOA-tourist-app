package com.soa.purchaseService.configuration;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

import com.soa.purchaseService.grpc.PurchaseGrpcServiceImpl;
import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class GrpcServerConfig {

    @Value("${grpc.server.port:9093}")
    private int grpcServerPort;

    private final TourPurchaseTokenRepository tokenRepository;
    private Server server;

    public GrpcServerConfig(TourPurchaseTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    @EventListener(ContextRefreshedEvent.class)
    public void startGrpcServer() throws IOException {
        if (server != null && !server.isShutdown()) {
            return;
        }
        server = ServerBuilder.forPort(grpcServerPort)
                .addService(new PurchaseGrpcServiceImpl(tokenRepository))
                .build()
                .start();
        log.info("Purchase gRPC server started on port {}", grpcServerPort);
    }

    @PreDestroy
    public void stopGrpcServer() {
        if (server != null) {
            log.info("Shutting down purchase gRPC server");
            server.shutdown();
        }
    }
}
