package com.soa.authService.services;

import com.soa.authService.configuration.JwtUtil;
import com.soa.authService.dtos.AuthResponse;
import com.soa.authService.dtos.LoginRequest;
import com.soa.authService.dtos.RegisterRequest;
import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import com.soa.authService.utils.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new IllegalArgumentException("Username is already taken");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Email is already taken");
        }

        if (Role.ADMIN.equals(registerRequest.getRole())) {
            throw new IllegalArgumentException("Cannot create user with ADMIN role.");
        }

        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setEmail(registerRequest.getEmail());
        user.setRole(registerRequest.getRole());

        User savedUser = userRepository.save(user);
        return new AuthResponse(jwtUtil.generateToken(savedUser, savedUser.getId()));
    }

    public AuthResponse authenticate(LoginRequest loginRequest) {
        var authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getEmail(),
                loginRequest.getPassword()
            )
        );

        User user = (User) authentication.getPrincipal();
        return new AuthResponse(jwtUtil.generateToken(user, user.getId()));
    }

}
