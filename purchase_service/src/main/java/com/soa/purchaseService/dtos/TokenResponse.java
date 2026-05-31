package com.soa.purchaseService.dtos;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TokenResponse {

    private String id;
    
    private String touristId;
    
    private String tourId;
    
    private String tourName;
    
    private double price;
    
    private Instant purchasedAt;
}
