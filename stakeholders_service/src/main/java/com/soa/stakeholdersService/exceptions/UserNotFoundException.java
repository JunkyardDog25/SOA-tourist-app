package com.soa.stakeholdersService.exceptions;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String authUserId) {
        super("User not found in database for authUserId: " + authUserId);
    }
}