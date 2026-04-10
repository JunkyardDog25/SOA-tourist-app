package com.soa.blogService.models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
}
