package com.soa.purchaseService.repositories;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;

import com.soa.purchaseService.models.SagaLog;

public interface SagaLogRepository extends Neo4jRepository<SagaLog, String> {

    Optional<SagaLog> findBySagaId(String sagaId);
}
