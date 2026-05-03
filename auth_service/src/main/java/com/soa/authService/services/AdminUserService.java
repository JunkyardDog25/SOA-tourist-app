package com.soa.authService.services;

import java.util.List;

import org.springframework.stereotype.Service;

import com.soa.authService.dtos.UserResponseDto;
import com.soa.authService.exceptions.UserNotFoundException;
import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import com.soa.authService.utils.Role;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .filter(user ->
                        !user.getRole().equals(Role.ADMIN)
                )
                .map(user -> new UserResponseDto(
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getRole(),
                        user.isBlocked()
                ))
                .toList();
    }

    public void setBlockedStatus(String userId, boolean blocked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        user.setBlocked(blocked);
        user.isEnabled();

        userRepository.save(user);
    }
}
