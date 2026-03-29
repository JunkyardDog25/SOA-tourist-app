package com.soa.stakeholdersService.repositories;

import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import com.soa.stakeholdersService.dtos.UserAdminViewDto;
import com.soa.stakeholdersService.models.User;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {
    @Query("""
        MATCH (u:User)
        RETURN u.id AS id,
               u.username AS username,
               u.email AS email,
               u.role AS role
        ORDER BY u.username
    """)
    List<UserAdminViewDto> findAllForAdminView();
}
