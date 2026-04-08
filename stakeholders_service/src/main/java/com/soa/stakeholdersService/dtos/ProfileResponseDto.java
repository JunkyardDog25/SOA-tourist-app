package com.soa.stakeholdersService.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProfileResponseDto {
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String profileImageUrl;
    private String biography;
    private String motto;
}