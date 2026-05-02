package com.soa.authService.services;

import com.soa.authService.dtos.UserResponseDto;
import com.soa.authService.exceptions.UserNotFoundException;
import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    public List<UserResponseDto> getAllUsers() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsernameOrEmail = authentication.getName();

        return userRepository.findAll()
                .stream()
                .filter(user ->
                        !user.getUsername().equals(currentUsernameOrEmail) &&
                        !user.getEmail().equals(currentUsernameOrEmail)
                )
                .map(this::mapToDto)
                .toList();
    }

    public void setBlockedStatus(String userId, boolean blocked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        user.setBlocked(blocked);
        userRepository.save(user);
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