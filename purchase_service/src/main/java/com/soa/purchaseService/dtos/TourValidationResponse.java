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
public class TourValidationResponse {

    private boolean allValid;

    private List<TourValidationResult> results;
}
