package com.soa.authService.dtos;

import com.soa.authService.utils.Role;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class UserResponseDto {
    
    private final String id;

    private final String username;
    
    private final String email;
    
    private final Role role;
    
    private final boolean blocked;
}
