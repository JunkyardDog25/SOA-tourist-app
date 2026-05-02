package com.soa.blogService.repositories;

import com.soa.blogService.models.Blog;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlogRepository extends Neo4jRepository<Blog, String> {

}
