package com.soa.stakeholdersService.services;

import com.soa.stakeholdersService.dtos.ProfileResponseDto;
import com.soa.stakeholdersService.exceptions.UserNotFoundException;
import com.soa.stakeholdersService.models.User;
import com.soa.stakeholdersService.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class UserService {

    private final UserRepository userRepository;

    public ProfileResponseDto getMyProfile() {
        String authUserId = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new UserNotFoundException("Profile not found"));

        return new ProfileResponseDto(
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getProfileImageUrl(),
                user.getBiography(),
                user.getMotto()
        );
    }
}