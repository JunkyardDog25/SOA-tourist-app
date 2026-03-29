package com.soa.stakeholdersService.services;

import com.soa.stakeholdersService.dtos.UserAdminViewDto;
import com.soa.stakeholdersService.dtos.UserDto;
import com.soa.stakeholdersService.models.User;
import com.soa.stakeholdersService.repositories.UserRepository;
import com.soa.stakeholdersService.utils.Role;

import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class UserService {
    @Autowired
    private final UserRepository userRepository;

    public String registerUser(UserDto userDto) {
        if (userDto.getRole() == Role.ADMIN) {
            return "Cannot create user with ADMIN role.";
        }
        User newUser = new User(userDto);

        userRepository.save(newUser);
        return "User created with ID: " + newUser.getId();
    }

    public List<UserAdminViewDto> getAllUsersForAdmin() {
        return userRepository.findAllForAdminView();
    }
}
