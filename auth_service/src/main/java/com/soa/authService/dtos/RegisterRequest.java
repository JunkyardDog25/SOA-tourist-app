package com.soa.authService.dtos;

import com.soa.authService.utils.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank private String username;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6)
    private String password;

    @NotNull
    private Role role;
}
