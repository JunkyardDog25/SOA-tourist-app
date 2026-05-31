package com.soa.purchaseService.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;

import com.soa.purchaseService.models.TourPurchaseToken;

public interface TourPurchaseTokenRepository extends Neo4jRepository<TourPurchaseToken, String> {
    
    List<TourPurchaseToken> findByTouristId(String touristId);

    Optional<TourPurchaseToken> findByTouristIdAndTourId(String touristId, String tourId);
    
    boolean existsByTouristIdAndTourId(String touristId, String tourId);

    List<TourPurchaseToken> findBySagaId(String sagaId);

    void deleteBySagaId(String sagaId);
}
