package com.soa.stakeholdersService.controllers;

import com.soa.stakeholdersService.dtos.CreateInternalUserDto;
import com.soa.stakeholdersService.dtos.ProfileResponseDto;
import com.soa.stakeholdersService.dtos.UpdateProfileDto;
import com.soa.stakeholdersService.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponseDto> getMyProfile() {
        return ResponseEntity.ok(userService.getMyProfile());
    }

    @PostMapping("/internal/users")
    public ResponseEntity<ProfileResponseDto> createInternalUser(@RequestBody CreateInternalUserDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createInternalUser(dto));
    }

    @PatchMapping("/me")
    public ResponseEntity<ProfileResponseDto> updateMyProfile(@RequestBody UpdateProfileDto dto) {
        return ResponseEntity.ok(userService.updateMyProfile(dto));
    }
}
