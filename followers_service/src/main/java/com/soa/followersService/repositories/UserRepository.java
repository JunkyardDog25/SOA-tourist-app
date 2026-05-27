package com.soa.followersService.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import com.soa.followersService.models.User;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {

    @Query("MATCH (u:User {userId: $userId})-[f:FOLLOWS]->(t:User) RETURN u, collect(f), collect(t)")
    Optional<User> findWithFollowingByUserId(String userId);

    @Query("RETURN EXISTS((:User {userId: $followerId})-[:FOLLOWS]->(:User {userId: $followeeId}))")
    boolean alreadyFollows(String followerId, String followeeId);

    @Query("MATCH (f:User {userId: $userId})-[:FOLLOWS]->(x:User) RETURN x.userId")
    List<String> findFollowingIds(String userId);

    @Query("MATCH (:User {userId: $followerId})-[f:FOLLOWS]->(:User {userId: $followeeId}) DELETE f")
    void deleteFollows(String followerId, String followeeId);

    @Query("MATCH (:User {userId: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(recommended:User) " +
           "WHERE NOT (:User {userId: $userId})-[:FOLLOWS]->(recommended) " +
           "AND recommended.userId <> $userId " +
           "RETURN DISTINCT recommended")
    List<User> findRecommendations(String userId);
}
