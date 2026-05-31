package com.soa.purchaseService.controllers;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalController {

    private final TourPurchaseTokenRepository tokenRepository;

    /**
     * Service-to-service endpoint (no auth) used by tour_service to check
     * if a tourist has purchased a specific tour.
     */
    @GetMapping("/tokens/check")
    public ResponseEntity<Map<String, Boolean>> checkToken(
            @RequestParam String touristId,
            @RequestParam String tourId) {
        boolean purchased = tokenRepository.existsByTouristIdAndTourId(touristId, tourId);
        return ResponseEntity.ok(Map.of("purchased", purchased));
    }
}
