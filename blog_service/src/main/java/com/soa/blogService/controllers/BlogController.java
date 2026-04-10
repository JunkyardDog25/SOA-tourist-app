package com.soa.blogService.controllers;

import com.soa.blogService.dtos.BlogResponseDto;
import com.soa.blogService.dtos.CreateBlogRequestDto;
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

    @PostMapping
    public ResponseEntity<BlogResponseDto> createBlog(@Valid @RequestBody CreateBlogRequestDto blogRequestDto) {
        BlogResponseDto response = blogService.createBlog(blogRequestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
