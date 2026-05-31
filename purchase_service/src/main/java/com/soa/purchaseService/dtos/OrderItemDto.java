package com.soa.purchaseService.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderItemDto {

    private String id;
    
    private String tourId;
    
    private String tourName;
    
    private double price;
}
