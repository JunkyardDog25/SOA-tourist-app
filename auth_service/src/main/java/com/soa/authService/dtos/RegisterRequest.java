package com.soa.authService.dtos;

import com.soa.authService.utils.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class RegisterRequest {
    
    @NotBlank
    private final String username;

    @NotBlank @Email
    private final String email;

    @NotBlank @Size(min = 6)
    private final String password;

    @NotNull
    private final Role role;
}
