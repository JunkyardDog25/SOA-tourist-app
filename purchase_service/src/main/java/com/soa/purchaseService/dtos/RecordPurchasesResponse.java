package com.soa.purchaseService.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordPurchasesResponse {

    private String sagaId;

    /** Opaque reference returned by tour-service that can be used for compensation. */
    private int recordsCreated;
}
