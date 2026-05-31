package com.soa.purchaseService.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.purchaseService.dtos.AddToCartRequest;
import com.soa.purchaseService.dtos.CartResponse;
import com.soa.purchaseService.dtos.CheckoutResult;
import com.soa.purchaseService.models.ShoppingCart;
import com.soa.purchaseService.repositories.ShoppingCartRepository;
import com.soa.purchaseService.services.CartService;
import com.soa.purchaseService.services.CheckoutSagaOrchestrator;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final CheckoutSagaOrchestrator sagaOrchestrator;
    private final ShoppingCartRepository cartRepository;

    @PostMapping
    public ResponseEntity<CartResponse> createCart(@AuthenticationPrincipal String touristId) {
        return ResponseEntity.ok(cartService.createCart(touristId));
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal String touristId) {
        return ResponseEntity.ok(cartService.getCart(touristId));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @AuthenticationPrincipal String touristId,
            @Valid @RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(cartService.addItem(touristId, request));
    }

    @DeleteMapping("/items/{tourId}")
    public ResponseEntity<CartResponse> removeItem(
            @AuthenticationPrincipal String touristId,
            @PathVariable String tourId) {
        return ResponseEntity.ok(cartService.removeItem(touristId, tourId));
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResult> checkout(@AuthenticationPrincipal String touristId) {
        ShoppingCart cart = cartRepository.findByTouristId(touristId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart not found"));
        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }
        return ResponseEntity.ok(sagaOrchestrator.execute(touristId, cart));
    }
}
