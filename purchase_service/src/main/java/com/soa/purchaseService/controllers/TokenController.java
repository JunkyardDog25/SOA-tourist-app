package com.soa.purchaseService.controllers;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.purchaseService.dtos.TokenResponse;
import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/tokens")
@RequiredArgsConstructor
public class TokenController {

    private final TourPurchaseTokenRepository tokenRepository;

    @GetMapping
    public ResponseEntity<List<TokenResponse>> getMyTokens(@AuthenticationPrincipal String touristId) {
        List<TokenResponse> tokens = tokenRepository.findByTouristId(touristId).stream()
                .map(t -> new TokenResponse(
                        t.getId(), t.getTouristId(), t.getTourId(),
                        t.getTourName(), t.getPrice(), t.getPurchasedAt()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(tokens);
    }

    @GetMapping("/check/{tourId}")
    public ResponseEntity<Map<String, Boolean>> checkToken(
            @AuthenticationPrincipal String touristId,
            @PathVariable String tourId) {
        boolean purchased = tokenRepository.existsByTouristIdAndTourId(touristId, tourId);
        return ResponseEntity.ok(Map.of("purchased", purchased));
    }
}
