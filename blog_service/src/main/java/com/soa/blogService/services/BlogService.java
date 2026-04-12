package com.soa.blogService.services;

import com.soa.blogService.dtos.BlogResponseDto;
import com.soa.blogService.dtos.CreateBlogRequestDto;
import com.soa.blogService.models.Blog;
import com.soa.blogService.repositories.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;

    public BlogResponseDto createBlog(CreateBlogRequestDto blogRequestDto) {
        String authorId = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        Blog blog = new Blog();
        blog.setTitle(blogRequestDto.getTitle());
        blog.setDescription(blogRequestDto.getDescription());
        blog.setCreationDate(LocalDateTime.now());
        blog.setAuthorId(authorId);
        blog.setImageUrls(blogRequestDto.getImageUrls() != null ? blogRequestDto.getImageUrls() : new ArrayList<>());

        Blog saved = blogRepository.save(blog);
        return mapToDto(saved);
    }

    private BlogResponseDto mapToDto(Blog blog) {
        return new BlogResponseDto(
                blog.getId(),
                blog.getTitle(),
                blog.getDescription(),
                blog.getCreationDate(),
                blog.getImageUrls(),
                blog.getAuthorId()
        );
    }
}
