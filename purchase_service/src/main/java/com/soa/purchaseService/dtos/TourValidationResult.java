package com.soa.purchaseService.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourValidationResult {

    private String tourId;

    private boolean valid;

    /** Human-readable reason when valid=false (null when valid=true). */
    private String reason;
}
