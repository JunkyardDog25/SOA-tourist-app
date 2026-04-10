package com.soa.blogService.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class BlogResponseDto {

    private String id;
    private String title;
    private String description;
    private LocalDateTime creationDate;
    private List<String> imageUrls;
    private String authorId;
}
