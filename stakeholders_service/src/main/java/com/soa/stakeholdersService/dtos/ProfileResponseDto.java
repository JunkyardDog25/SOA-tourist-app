package com.soa.stakeholdersService.dtos;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public final class ProfileResponseDto {

    private final String username;

    private final String email;
    
    private final String firstName;
    
    private final String lastName;
    
    private final String profileImageUrl;
    
    private final String biography;

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