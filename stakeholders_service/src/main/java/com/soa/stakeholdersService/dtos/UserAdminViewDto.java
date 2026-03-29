package com.soa.stakeholdersService.dtos;

import com.soa.stakeholdersService.utils.Role;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UserAdminViewDto {
    private String id;
    private String username;
    private String email;
    private Role role;

    public UserAdminViewDto() {
    }

    public UserAdminViewDto(String id, String username, String email, Role role) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
    }
}
