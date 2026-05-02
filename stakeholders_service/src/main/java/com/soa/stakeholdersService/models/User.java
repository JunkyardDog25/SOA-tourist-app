package com.soa.stakeholdersService.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.soa.stakeholdersService.utils.Role;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

@Node("User")
@Getter @Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String authUserId;
    private String username;

    @JsonIgnore
    private String password;

    private String email;
    private Role role;

    private String firstName;
    private String lastName;
    private String profileImageUrl;
    private String biography;
    private String motto;
}