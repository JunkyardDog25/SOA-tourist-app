package com.soa.stakeholdersService.repositories;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import com.soa.stakeholdersService.models.User;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {

    Optional<User> findById(String id);
    
    Optional<User> findByEmail(String email);
}
