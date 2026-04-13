package com.soa.blogService.exceptions;

public class LikeNotFoundException extends RuntimeException {
    public LikeNotFoundException() {
        super("You have not liked this blog");
    }
}
