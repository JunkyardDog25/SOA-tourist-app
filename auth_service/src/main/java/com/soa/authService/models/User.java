package com.soa.authService.models;


import java.util.Collection;
import java.util.List;

import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.soa.authService.utils.Role;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@Node( "User")
@Getter @Setter
@AllArgsConstructor @NoArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotBlank
    private String email;

    private Role role;
    
    private boolean blocked;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null) return List.of();
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // ← ovo je semantički ispravno
    }

    @Override
    public boolean isEnabled() {
        return !blocked; // osim ako imaš posebnu logiku za enable/disable
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
