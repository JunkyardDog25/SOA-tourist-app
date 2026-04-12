package com.soa.blogService.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class CommentResponseDto {

    private String id;
    private String text;
    private String authorId;
    private String authorEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
