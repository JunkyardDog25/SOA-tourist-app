package com.soa.followersService.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.followersService.dtos.FollowRequest;
import com.soa.followersService.dtos.UserDto;
import com.soa.followersService.services.FollowService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/follow")
@RequiredArgsConstructor
public class FollowersController {

    private final FollowService followService;

    @PostMapping
    public ResponseEntity<Void> follow(@AuthenticationPrincipal String followerId,
                                       @Valid @RequestBody FollowRequest request) {
        followService.follow(followerId, request.getFolloweeId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{followeeId}")
    public ResponseEntity<Void> unfollow(@AuthenticationPrincipal String followerId,
                                         @PathVariable String followeeId) {
        followService.unfollow(followerId, followeeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/following")
    public ResponseEntity<List<String>> getFollowing(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    @GetMapping("/followers/{userId}")
    public ResponseEntity<List<String>> getFollowers(@PathVariable String userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<UserDto>> getRecommendations(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(followService.getRecommendations(userId));
    }
}
