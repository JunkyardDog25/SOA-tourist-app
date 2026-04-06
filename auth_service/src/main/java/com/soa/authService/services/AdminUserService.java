package com.soa.authService.services;


import com.soa.authService.dtos.UserResponseDto;
import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll() //Vraća objekat User koji pretvramo u stream i mapiramo na UserResponseDto, a zatim vraćamo kao listu
                .stream()//.map(user -> new UserResponseDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), user.isBlocked()))//mapiramo svaki User objekat u UserResponseDto
                .map(this::mapToDto)
                .toList();
    }

    private UserResponseDto mapToDto(User user) {
        return new UserResponseDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isBlocked()
        );
    }
}