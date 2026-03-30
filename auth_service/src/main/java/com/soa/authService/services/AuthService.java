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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public AuthResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new IllegalArgumentException("Username is already taken");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Email is already taken");
        }

        if (registerRequest.getRole().equals(Role.ADMIN)) {
            throw new IllegalArgumentException("Cannot create user with ADMIN role.");
        }

        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setEmail(registerRequest.getEmail());
        user.setRole(registerRequest.getRole());

        userRepository.save(user);
        return new AuthResponse(jwtUtil.generateToken(user));
    }

    public AuthResponse authenticate(LoginRequest loginRequest) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );
        return new AuthResponse(jwtUtil.generateToken(userDetailsService.loadUserByUsername(loginRequest.getEmail())));
    }
}
