package com.soa.stakeholdersService.dtos;

import com.soa.stakeholdersService.utils.Role;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter @Setter
public class UserDto {
    private String username;
    private String password;
    private String email;
    private Role role;
}
