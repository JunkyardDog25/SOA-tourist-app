package com.soa.stakeholdersService.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProfileResponseDto {
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String profileImageUrl;
    private String biography;
    private String motto;
}
//Ručno dodavanje korisnika u bazu podataka (Neo4j) za testiranje profila korisnika
//Ovaj Cypher upit kreira čvor "User" sa svim potrebnim atributima za testiranje funkcionalnosti profila korisnika u aplikaciji.
/*
CREATE (u:User {
    id: randomUUID(),
    authUserId: "52403a1c-9923-4622-af14-08193e5aafcd",
    username: "Isidor2004",
    email: "isidorivanov061@gmail.com",
    role: "GUIDE",
    firstName: "Isidor",
    lastName: "Ivanov",
    profileImageUrl: "https://example.com/avatar.jpg",
    biography: "Iskusni vodič sa 5 godina iskustva.",
    motto: "Putuj, uči, rasti."
})
RETURN u
*/