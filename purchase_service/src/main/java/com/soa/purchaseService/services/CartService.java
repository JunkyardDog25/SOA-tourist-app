package com.soa.purchaseService.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.soa.purchaseService.dtos.AddToCartRequest;
import com.soa.purchaseService.dtos.CartResponse;
import com.soa.purchaseService.dtos.OrderItemDto;
import com.soa.purchaseService.dtos.TokenResponse;
import com.soa.purchaseService.models.OrderItem;
import com.soa.purchaseService.models.ShoppingCart;
import com.soa.purchaseService.models.TourPurchaseToken;
import com.soa.purchaseService.repositories.ShoppingCartRepository;
import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CartService {

    private final ShoppingCartRepository cartRepository;
    
    private final TourPurchaseTokenRepository tokenRepository;

    public CartResponse createCart(String touristId) {
        if (cartRepository.existsByTouristId(touristId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cart already exists");
        }
        ShoppingCart cart = new ShoppingCart();
        cart.setTouristId(touristId);
        cart.setTotalPrice(0.0);
        cart.setItems(new ArrayList<>());
        
        cartRepository.save(cart);
        return toResponse(cart);
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(String touristId) {
        ShoppingCart cart = findCart(touristId);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse addItem(String touristId, AddToCartRequest request) {
        if (tokenRepository.existsByTouristIdAndTourId(touristId, request.getTourId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tour already purchased");
        }

        ShoppingCart cart = findCart(touristId);

        boolean alreadyInCart = cart.getItems().stream()
                .anyMatch(item -> item.getTourId().equals(request.getTourId()));
        if (alreadyInCart) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tour already in cart");
        }

        cartRepository.addItemToCart(touristId, request.getTourId(), request.getTourName(), request.getPrice());

        OrderItem newItem = new OrderItem(null, request.getTourId(), request.getTourName(), request.getPrice());
        cart.getItems().add(newItem);
        recalculateTotal(cart);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(String touristId, String tourId) {
        ShoppingCart cart = findCart(touristId);

        boolean exists = cart.getItems().stream()
                .anyMatch(item -> item.getTourId().equals(tourId));
        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour not found in cart");
        }

        cartRepository.removeItemFromCart(touristId, tourId);

        cart.getItems().removeIf(item -> item.getTourId().equals(tourId));
        recalculateTotal(cart);
        return toResponse(cart);
    }

    @Transactional
    public List<TokenResponse> checkout(String touristId) {
        ShoppingCart cart = cartRepository.findByTouristId(touristId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        List<TourPurchaseToken> tokens = new ArrayList<>();
        Instant now = Instant.now();

        for (OrderItem item : cart.getItems()) {
            if (tokenRepository.existsByTouristIdAndTourId(touristId, item.getTourId())) {
                continue;
            }
            TourPurchaseToken token = new TourPurchaseToken(
                    null, touristId, item.getTourId(), item.getTourName(), item.getPrice(), now, null
            );
            tokens.add(tokenRepository.save(token));
        }

        cartRepository.clearCart(touristId);

        return tokens.stream()
                .map(t -> new TokenResponse(
                        t.getId(), t.getTouristId(), t.getTourId(),
                        t.getTourName(), t.getPrice(), t.getPurchasedAt()))
                .collect(Collectors.toList());
    }

    private ShoppingCart findCart(String touristId) {
        return cartRepository.findByTouristId(touristId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart not found"));
    }

    private void recalculateTotal(ShoppingCart cart) {
        double total = cart.getItems().stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();
        cart.setTotalPrice(total);
    }

    private CartResponse toResponse(ShoppingCart cart) {
        List<OrderItemDto> items = cart.getItems().stream()
                .map(item -> new OrderItemDto(
                        item.getId(), item.getTourId(), item.getTourName(), item.getPrice()))
                .collect(Collectors.toList());
        return new CartResponse(cart.getTouristId(), cart.getTotalPrice(), items);
    }
}
