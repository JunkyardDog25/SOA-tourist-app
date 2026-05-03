package com.soa.stakeholdersService.dtos;

import com.soa.stakeholdersService.utils.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class SyncAuthUser {

    @NotBlank
    private final String id;

    @NotBlank
    private final String username;

    @NotBlank @Email
    private final String email;

    @NotNull
    private final Role role;
}
