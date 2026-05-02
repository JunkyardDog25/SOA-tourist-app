package com.soa.stakeholdersService.services;

import com.soa.stakeholdersService.dtos.ProfileResponseDto;
import com.soa.stakeholdersService.dtos.UpdateProfileDto;
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
                .getAuthentication().getName();
        String email = (String) SecurityContextHolder.getContext()
                .getAuthentication().getDetails();

        User user = userRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new UserNotFoundException(email));

        return mapToDto(user);
    }

    public ProfileResponseDto updateMyProfile(UpdateProfileDto dto) {
        String authUserId = SecurityContextHolder.getContext()
                .getAuthentication().getName();
        String email = (String) SecurityContextHolder.getContext()
                .getAuthentication().getDetails();

        User user = userRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new UserNotFoundException(email));

        // Mijenjamo samo polja koja nisu null
        if (dto.getFirstName() != null) user.setFirstName(dto.getFirstName());
        if (dto.getLastName() != null) user.setLastName(dto.getLastName());
        if (dto.getProfileImageUrl() != null) user.setProfileImageUrl(dto.getProfileImageUrl());
        if (dto.getBiography() != null) user.setBiography(dto.getBiography());
        if (dto.getMotto() != null) user.setMotto(dto.getMotto());

        userRepository.save(user);
        return mapToDto(user);
    }

    private ProfileResponseDto mapToDto(User user) {
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