package com.soa.purchaseService.repositories;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;

import com.soa.purchaseService.models.TourExecutionRecord;
import com.soa.purchaseService.models.TourExecutionRecord.Status;

public interface TourExecutionRecordRepository extends Neo4jRepository<TourExecutionRecord, String> {

    Optional<TourExecutionRecord> findBySagaId(String sagaId);

    Optional<TourExecutionRecord> findByExecutionIdAndTouristIdAndStatus(
            String executionId, String touristId, Status status);

    void deleteBySagaId(String sagaId);

    boolean existsByTouristIdAndTourIdAndStatus(String touristId, String tourId, Status status);
}
