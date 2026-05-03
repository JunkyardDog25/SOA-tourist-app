package com.soa.stakeholdersService.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.soa.stakeholdersService.utils.Role;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.neo4j.core.schema.Node;

@Node("User")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class User {

    @Id
    private String id;

    private String username;

    @JsonIgnore
    private String password;

    private String email;

    private Role role;

    private String firstName;

    private String lastName;

    private String profileImageUrl;

    private String biography;
}
