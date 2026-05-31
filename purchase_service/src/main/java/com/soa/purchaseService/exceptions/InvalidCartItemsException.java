package com.soa.purchaseService.exceptions;

import java.util.List;

import com.soa.purchaseService.dtos.TourValidationResult;

import lombok.Getter;

@Getter
public class InvalidCartItemsException extends RuntimeException {

    private final List<TourValidationResult> invalidItems;

    public InvalidCartItemsException(List<TourValidationResult> invalidItems) {
        super("Cart contains invalid items");
        this.invalidItems = invalidItems;
    }
}
