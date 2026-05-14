package com.soa.followersService.models;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Node("User")
@AllArgsConstructor
@NoArgsConstructor
public class User {

    @Id
    private String userId;

    @Relationship(type = "FOLLOWS", direction = Relationship.Direction.OUTGOING)
    private List<Follows> following = new ArrayList<>();
}
