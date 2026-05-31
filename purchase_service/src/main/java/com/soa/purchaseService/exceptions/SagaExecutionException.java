package com.soa.purchaseService.exceptions;

import lombok.Getter;

@Getter
public class SagaExecutionException extends RuntimeException {

    private final String sagaId;

    public SagaExecutionException(String sagaId, String message) {
        super(message);
        this.sagaId = sagaId;
    }

    public SagaExecutionException(String sagaId, String message, Throwable cause) {
        super(message, cause);
        this.sagaId = sagaId;
    }
}
