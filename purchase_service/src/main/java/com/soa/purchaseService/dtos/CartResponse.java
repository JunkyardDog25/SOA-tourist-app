package com.soa.purchaseService.dtos;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CartResponse {

    private String touristId;
    
    private double totalPrice;
    
    private List<OrderItemDto> items;
}
