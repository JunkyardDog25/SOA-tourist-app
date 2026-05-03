package com.soa.stakeholdersService.dtos;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class UpdateProfileDto {

    private final String firstName;
    
    private final String lastName;
    
    private final String profileImageUrl;
    
    private final String biography;
}
