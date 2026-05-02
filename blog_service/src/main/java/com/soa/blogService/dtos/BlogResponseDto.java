package com.soa.blogService.dtos;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class BlogResponseDto {

    private String id;
    private String title;
    private String description;
    private LocalDateTime creationDate;
    private List<String> imageUrls;
    private String authorId;
    private String authorEmail;
    private long likeCount;
    private boolean likedByCurrentUser;
    private List<CommentResponseDto> comments;
}
