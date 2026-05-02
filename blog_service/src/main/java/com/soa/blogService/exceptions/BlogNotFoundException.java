package com.soa.blogService.exceptions;

public class BlogNotFoundException extends RuntimeException {
    public BlogNotFoundException(String blogId) {
        super("Blog not found with id: " + blogId);
    }
}
