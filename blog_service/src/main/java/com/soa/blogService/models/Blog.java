package com.soa.blogService.models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Node("Blog")
@Getter @Setter
@NoArgsConstructor
public class Blog {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String title;

    private String description;

    private LocalDateTime creationDate;

    private List<String> imageUrls = new ArrayList<>();

    private String authorId;

    /** Email autora iz JWT u trenutku kreiranja bloga. */
    private String authorEmail;

    @Relationship(type = "HAS_COMMENT", direction = Relationship.Direction.OUTGOING)
    private List<Comment> comments = new ArrayList<>();

    /** ID-jevi korisnika koji su lajkovali (najviše jednom po korisniku). */
    private Set<String> likedUserIds = new HashSet<>();
}
