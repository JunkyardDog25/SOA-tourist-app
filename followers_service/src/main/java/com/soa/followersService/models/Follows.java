package com.soa.followersService.models;

import java.time.LocalDateTime;

import org.springframework.data.neo4j.core.schema.RelationshipId;
import org.springframework.data.neo4j.core.schema.RelationshipProperties;
import org.springframework.data.neo4j.core.schema.TargetNode;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@RelationshipProperties
@AllArgsConstructor
@NoArgsConstructor
public class Follows {

    @RelationshipId
    private Long id;

    private LocalDateTime createdAt;

    @TargetNode
    private User target;

    public Follows(User target) {
        this.target = target;
        this.createdAt = LocalDateTime.now();
    }
}
