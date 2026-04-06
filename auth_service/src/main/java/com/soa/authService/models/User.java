package com.soa.authService.models;


import java.util.Collection;
import java.util.List;


import com.soa.authService.utils.Role;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Node( "User")
@Data
@NoArgsConstructor
@AllArgsConstructor
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
    
    private boolean blocked=false;

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
        return !blocked; // ← ovo je semantički ispravno
    }

    @Override
    public boolean isEnabled() {
        return true; // osim ako imaš posebnu logiku za enable/disable
    }
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

}
