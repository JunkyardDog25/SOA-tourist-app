package com.soa.authService.dtos;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class AuthResponse {
    
    private final String token;
}
