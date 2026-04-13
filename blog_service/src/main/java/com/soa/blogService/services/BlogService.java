package com.soa.blogService.services;

import com.soa.blogService.dtos.BlogResponseDto;
import com.soa.blogService.dtos.CommentResponseDto;
import com.soa.blogService.dtos.CreateBlogRequestDto;
import com.soa.blogService.dtos.CreateCommentRequestDto;
import com.soa.blogService.dtos.UpdateCommentRequestDto;
import com.soa.blogService.exceptions.AlreadyLikedException;
import com.soa.blogService.exceptions.BlogNotFoundException;
import com.soa.blogService.exceptions.CommentNotFoundException;
import com.soa.blogService.exceptions.LikeNotFoundException;
import com.soa.blogService.models.Blog;
import com.soa.blogService.models.Comment;
import com.soa.blogService.repositories.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class BlogService {

    private final BlogRepository blogRepository;

    public BlogResponseDto createBlog(CreateBlogRequestDto blogRequestDto) {
        String authorId = currentUserId();
        String authorEmail = currentUserEmailOrNull();

        Blog blog = new Blog();
        blog.setTitle(blogRequestDto.getTitle());
        blog.setDescription(blogRequestDto.getDescription());
        blog.setCreationDate(LocalDateTime.now());
        blog.setAuthorId(authorId);
        blog.setAuthorEmail(authorEmail);
        blog.setImageUrls(blogRequestDto.getImageUrls() != null ? blogRequestDto.getImageUrls() : new ArrayList<>());
        blog.setComments(new ArrayList<>());
        blog.setLikedUserIds(new HashSet<>());

        Blog saved = blogRepository.save(blog);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public BlogResponseDto getBlogById(String blogId) {
        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException(blogId));
        return mapToDto(blog);
    }

    public CommentResponseDto addComment(String blogId, CreateCommentRequestDto dto) {
        String authorId = currentUserId();
        String authorEmail = currentUserEmailOrNull();

        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException(blogId));

        Comment comment = new Comment();
        comment.setText(dto.getText());
        comment.setAuthorId(authorId);
        comment.setAuthorEmail(authorEmail);
        LocalDateTime now = LocalDateTime.now();
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);

        if (blog.getComments() == null) {
            blog.setComments(new ArrayList<>());
        }
        blog.getComments().add(comment);

        blogRepository.save(blog);
        return mapComment(comment);
    }

    public BlogResponseDto likeBlog(String blogId) {
        String userId = currentUserId();
        if (userId == null || userId.isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }

        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException(blogId));

        Set<String> ids = blog.getLikedUserIds();
        if (ids == null) {
            ids = new HashSet<>();
            blog.setLikedUserIds(ids);
        }
        if (!ids.add(userId)) {
            throw new AlreadyLikedException();
        }

        Blog saved = blogRepository.save(blog);
        return mapToDto(saved);
    }

    public BlogResponseDto unlikeBlog(String blogId) {
        String userId = currentUserId();
        if (userId == null || userId.isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }

        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException(blogId));

        Set<String> ids = blog.getLikedUserIds();
        if (ids == null || !ids.remove(userId)) {
            throw new LikeNotFoundException();
        }

        Blog saved = blogRepository.save(blog);
        return mapToDto(saved);
    }

    public CommentResponseDto updateComment(String blogId, String commentId, UpdateCommentRequestDto dto) {
        String userId = currentUserId();

        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException(blogId));

        Comment comment = findComment(blog, commentId);
        if (!userId.equals(comment.getAuthorId())) {
            throw new AccessDeniedException("You can only edit your own comments");
        }

        comment.setText(dto.getText());
        comment.setUpdatedAt(LocalDateTime.now());
        blogRepository.save(blog);
        return mapComment(comment);
    }

    private static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private static String currentUserIdIfAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String userId) || userId.isBlank()) {
            return null;
        }
        if ("anonymousUser".equals(userId)) {
            return null;
        }
        return userId;
    }

    private static String currentUserEmailOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return null;
        }
        Object details = auth.getDetails();
        return details instanceof String email ? email : null;
    }

    private static Comment findComment(Blog blog, String commentId) {
        List<Comment> comments = blog.getComments();
        if (comments == null) {
            throw new CommentNotFoundException(commentId);
        }
        return comments.stream()
                .filter(c -> commentId.equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new CommentNotFoundException(commentId));
    }

    private BlogResponseDto mapToDto(Blog blog) {
        List<Comment> raw = blog.getComments();
        List<CommentResponseDto> commentDtos = raw == null ? List.of() : raw.stream()
                .sorted(Comparator.comparing(Comment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::mapComment)
                .toList();

        Set<String> likedIds = blog.getLikedUserIds();
        long likeCount = likedIds == null ? 0 : likedIds.size();
        String viewerId = currentUserIdIfAuthenticated();
        boolean likedByCurrentUser = viewerId != null && likedIds != null && likedIds.contains(viewerId);

        return new BlogResponseDto(
                blog.getId(),
                blog.getTitle(),
                blog.getDescription(),
                blog.getCreationDate(),
                blog.getImageUrls(),
                blog.getAuthorId(),
                blog.getAuthorEmail(),
                likeCount,
                likedByCurrentUser,
                commentDtos
        );
    }

    private CommentResponseDto mapComment(Comment comment) {
        return new CommentResponseDto(
                comment.getId(),
                comment.getText(),
                comment.getAuthorId(),
                comment.getAuthorEmail(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
