package com.soa.purchaseService.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.soa.purchaseService.dtos.CheckoutFailureResponse;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidCartItemsException.class)
    public ResponseEntity<CheckoutFailureResponse> handleInvalidCartItems(InvalidCartItemsException ex) {
        log.warn("Checkout rejected — invalid cart items: {}", ex.getInvalidItems().size());
        CheckoutFailureResponse body = CheckoutFailureResponse.builder()
                .message("One or more cart items are invalid. Please review your cart.")
                .invalidItems(ex.getInvalidItems())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(TourServiceException.class)
    public ResponseEntity<Map<String, String>> handleTourServiceException(TourServiceException ex) {
        log.error("Tour service error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(SagaExecutionException.class)
    public ResponseEntity<Map<String, String>> handleSagaExecutionException(SagaExecutionException ex) {
        log.error("SAGA execution failed, sagaId={}: {}", ex.getSagaId(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "error", "Checkout failed. Please contact support.",
                        "reference", ex.getSagaId()));
    }
}
