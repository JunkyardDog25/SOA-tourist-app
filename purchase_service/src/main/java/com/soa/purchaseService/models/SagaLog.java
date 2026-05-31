package com.soa.purchaseService.models;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Node("SagaLog")
@NoArgsConstructor
public class SagaLog {

    public enum Status {
        STARTED, COMPENSATING, COMPLETED, FAILED
    }

    @Id
    @GeneratedValue
    private String id;

    private String sagaId;

    private String touristId;

    private Status status;

    private List<String> completedSteps = new ArrayList<>();

    private String failedStep;

    private String errorMessage;

    private boolean compensationIncomplete;

    private Instant createdAt;

    private Instant updatedAt;
}
