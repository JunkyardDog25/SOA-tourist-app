package com.soa.purchaseService.models;

import java.time.Instant;

import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Node("TourExecutionRecord")
@NoArgsConstructor
@AllArgsConstructor
public class TourExecutionRecord {

    public enum Status {
        STARTED,
        COMPLETED
    }

    @Id
    @GeneratedValue
    private String id;

    private String sagaId;

    private String executionId;

    private String touristId;

    private String tourId;

    private Status status;

    private Instant startedAt;

    private Instant completedAt;
}
