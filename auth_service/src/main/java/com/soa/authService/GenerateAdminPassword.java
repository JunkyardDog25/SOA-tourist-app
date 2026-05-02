package com.soa.authService;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateAdminPassword {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String rawPassword = "admin123";
        String hashedPassword = encoder.encode(rawPassword);

        System.out.println("Raw password: " + rawPassword);
        System.out.println("Hashed password: " + hashedPassword);
    }
}
/*
CREATE (u:User {
    id: "admin-001",
    username: "admin",
    email: "admin@gmail.com",
    password: "$2a$10$64qXrrG1Rz0rz2QnwiD4z.AUsjHb1Qz/zrwb4NWO7V/mr17Z9gEXC",
    role: "ADMIN",
    blocked: false
});
*/