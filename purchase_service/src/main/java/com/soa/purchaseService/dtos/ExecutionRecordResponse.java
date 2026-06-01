package com.soa.purchaseService.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExecutionRecordResponse {

    private String id;
    private String sagaId;
    private String executionId;
    private String touristId;
    private String tourId;
    private String status;
}
