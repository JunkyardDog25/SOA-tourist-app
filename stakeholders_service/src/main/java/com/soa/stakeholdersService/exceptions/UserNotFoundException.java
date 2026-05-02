package com.soa.stakeholdersService.exceptions;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String email) {
        super("User not found in database for email: " + email);
    }
}