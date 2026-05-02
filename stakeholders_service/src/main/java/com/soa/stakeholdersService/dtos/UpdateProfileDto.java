package com.soa.stakeholdersService.dtos;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
public class UpdateProfileDto {
    private String firstName;
    private String lastName;
    private String profileImageUrl;
    private String biography;
    private String motto;
}