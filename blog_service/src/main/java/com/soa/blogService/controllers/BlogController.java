package com.soa.blogService.controllers;

import com.soa.blogService.dtos.BlogResponseDto;
import com.soa.blogService.dtos.CommentResponseDto;
import com.soa.blogService.dtos.CreateBlogRequestDto;
import com.soa.blogService.dtos.CreateCommentRequestDto;
import com.soa.blogService.dtos.UpdateCommentRequestDto;
import com.soa.blogService.services.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blogs")
@RequiredArgsConstructor
public class BlogController {

    private final BlogService blogService;

    @GetMapping("/{blogId}")
    public ResponseEntity<BlogResponseDto> getBlog(@PathVariable String blogId) {
        return ResponseEntity.ok(blogService.getBlogById(blogId));
    }

    @PostMapping
    public ResponseEntity<BlogResponseDto> createBlog(@Valid @RequestBody CreateBlogRequestDto blogRequestDto) {
        BlogResponseDto response = blogService.createBlog(blogRequestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{blogId}/comments")
    public ResponseEntity<CommentResponseDto> addComment(
            @PathVariable String blogId,
            @Valid @RequestBody CreateCommentRequestDto dto) {
        CommentResponseDto response = blogService.addComment(blogId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{blogId}/comments/{commentId}")
    public ResponseEntity<CommentResponseDto> updateComment(
            @PathVariable String blogId,
            @PathVariable String commentId,
            @Valid @RequestBody UpdateCommentRequestDto dto) {
        return ResponseEntity.ok(blogService.updateComment(blogId, commentId, dto));
    }

    @PostMapping("/{blogId}/likes")
    public ResponseEntity<BlogResponseDto> likeBlog(@PathVariable String blogId) {
        return ResponseEntity.ok(blogService.likeBlog(blogId));
    }

    @DeleteMapping("/{blogId}/likes")
    public ResponseEntity<BlogResponseDto> unlikeBlog(@PathVariable String blogId) {
        return ResponseEntity.ok(blogService.unlikeBlog(blogId));
    }
}
