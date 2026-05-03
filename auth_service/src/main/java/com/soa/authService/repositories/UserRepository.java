package com.soa.authService.repositories;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import com.soa.authService.models.User;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}
