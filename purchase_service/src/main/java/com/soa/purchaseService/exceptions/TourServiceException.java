package com.soa.purchaseService.exceptions;

import lombok.Getter;

@Getter
public class TourServiceException extends RuntimeException {

    public TourServiceException(String message) {
        super(message);
    }

    public TourServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
