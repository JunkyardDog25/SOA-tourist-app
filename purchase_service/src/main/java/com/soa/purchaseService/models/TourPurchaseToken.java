package com.soa.purchaseService.models;

import java.time.Instant;

import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Node("TourPurchaseToken")
@NoArgsConstructor @AllArgsConstructor
public class TourPurchaseToken {

    @Id
    @GeneratedValue
    private String id;

    private String touristId;
    
    private String tourId;

    private String tourName;

    private double price;

    private Instant purchasedAt;

    private String sagaId;
}
