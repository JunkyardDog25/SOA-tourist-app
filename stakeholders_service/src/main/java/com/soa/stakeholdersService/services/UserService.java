package com.soa.stakeholdersService.services;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.soa.stakeholdersService.dtos.ProfileResponseDto;
import com.soa.stakeholdersService.dtos.SyncAuthUser;
import com.soa.stakeholdersService.dtos.UpdateProfileDto;
import com.soa.stakeholdersService.exceptions.UserNotFoundException;
import com.soa.stakeholdersService.models.User;
import com.soa.stakeholdersService.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public ProfileResponseDto createInternalUser(SyncAuthUser dto) {

        User user = userRepository.findById(dto.getId())
                .orElseGet(User::new);

        user.setId(dto.getId());
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setRole(dto.getRole());

        userRepository.save(user);

        return new ProfileResponseDto(
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getProfileImageUrl(),
                user.getBiography()
        );
    }

    public ProfileResponseDto getMyProfile() {
        String authUserId = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        String email = (String) SecurityContextHolder.getContext()
                .getAuthentication().getDetails();

        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new UserNotFoundException(email));

        return new ProfileResponseDto(
                user.getUsername(),
                email,
                user.getFirstName(),
                user.getLastName(),
                user.getProfileImageUrl(),
                user.getBiography()
        );
    }

    public ProfileResponseDto updateMyProfile(UpdateProfileDto dto) {
        String authUserId = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        String email = (String) SecurityContextHolder.getContext()
                .getAuthentication().getDetails();

        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new UserNotFoundException(email));

        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setProfileImageUrl(dto.getProfileImageUrl());
        user.setBiography(dto.getBiography());

        userRepository.save(user);

        return new ProfileResponseDto(
                user.getUsername(),
                email,
                user.getFirstName(),
                user.getLastName(),
                user.getProfileImageUrl(),
                user.getBiography()
        );
    }
}
