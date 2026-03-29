package com.soa.stakeholdersService.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.stakeholdersService.dtos.UserAdminViewDto;
import com.soa.stakeholdersService.services.UserService;

@RestController
@RequestMapping("/admin/users")
public class AdminUserController {
    @Autowired
    private UserService adminUserService;
    @GetMapping("/show-all")
    public ResponseEntity<List<UserAdminViewDto>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsersForAdmin());
    }

}
