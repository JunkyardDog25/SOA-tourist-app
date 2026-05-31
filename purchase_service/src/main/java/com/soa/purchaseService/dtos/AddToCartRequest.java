package com.soa.purchaseService.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class AddToCartRequest {

    @NotBlank
    private String tourId;

    @NotBlank
    private String tourName;

    @Positive
    private double price;
}
