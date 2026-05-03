package com.soa.authService.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.soa.authService.configuration.JwtUtil;
import com.soa.authService.dtos.AuthResponse;
import com.soa.authService.dtos.LoginRequest;
import com.soa.authService.dtos.RegisterRequest;
import com.soa.authService.dtos.SyncAuthUser;
import com.soa.authService.exceptions.AccountBlockedException;
import com.soa.authService.models.User;
import com.soa.authService.repositories.UserRepository;
import com.soa.authService.utils.Role;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Value("${stakeholders.service.url:http://stakeholders-service:8080/api/stakeholders}")
    private String stakeholdersServiceUrl;

    @Transactional
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

        try {
            SyncAuthUser provisionRequest = new SyncAuthUser(
                    savedUser.getId(),
                    savedUser.getUsername(),
                    savedUser.getEmail(),
                    savedUser.getRole().name()
            );

            new RestTemplate().postForEntity(
                    stakeholdersServiceUrl + "/sync/user",
                    provisionRequest,
                    Void.class
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to provision stakeholder profile", ex);
        }

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
        if (user.isBlocked()) {
            throw new AccountBlockedException("Your account has been blocked by an administrator.");
        }
        
        return new AuthResponse(jwtUtil.generateToken(user, user.getId()));
    }
}
