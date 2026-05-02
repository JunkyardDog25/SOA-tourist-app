package com.soa.authService.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProvisionStakeholderUserRequest {
    private String authUserId;
    private String username;
    private String email;
    private String role;
}
