package com.soa.blogService.exceptions;

public class AlreadyLikedException extends RuntimeException {
    public AlreadyLikedException() {
        super("You have already liked this blog");
    }
}
