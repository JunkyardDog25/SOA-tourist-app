package com.soa.stakeholdersService.dtos;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateInternalUserDto {
    private String authUserId;
    private String username;
    private String email;
    private String role;
}