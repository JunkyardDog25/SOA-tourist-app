package com.soa.purchaseService.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecordExecutionCompleteRequest {

    @NotBlank
    private String sagaId;

    @NotBlank
    private String executionId;

    @NotBlank
    private String touristId;

    @NotBlank
    private String tourId;
}
