package com.soa.purchaseService.dtos;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordPurchasesRequest {

    private String sagaId;

    private String touristId;

    private List<PurchaseItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseItem {
        private String tourId;
        private double price;
    }
}
