package com.soa.stakeholdersService.repositories;

import org.springframework.stereotype.Repository;
import org.springframework.data.neo4j.repository.Neo4jRepository;

import com.soa.stakeholdersService.models.User;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {
    
}
