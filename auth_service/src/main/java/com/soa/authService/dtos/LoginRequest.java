package com.soa.authService.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class LoginRequest {
    
    @NotBlank
    private final String email;
    
    @NotBlank
    private final String password;
}
