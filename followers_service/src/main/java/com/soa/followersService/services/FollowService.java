package com.soa.followersService.services;

import com.soa.followersService.models.Follows;
import com.soa.followersService.models.User;
import com.soa.followersService.repositories.UserRepository;
import com.soa.grpc.GetUserByIdRequest;
import com.soa.grpc.GetUserByIdResponse;
import com.soa.grpc.UserServiceGrpc;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final UserRepository userRepository;
    private final UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    @Transactional
    public void follow(String followerId, String followeeId) {
        if (followerId.equals(followeeId)) {
            throw new IllegalArgumentException("A user cannot follow themselves.");
        }

        if (userRepository.alreadyFollows(followerId, followeeId)) {
            throw new IllegalStateException("Already following this user.");
        }

        // Verify follower exists in auth service
        GetUserByIdResponse followerResponse = userServiceStub.getUserById(
                GetUserByIdRequest.newBuilder().setUserId(followerId).build()
        );
        if (!followerResponse.getFound()) {
            throw new IllegalArgumentException("Follower user not found.");
        }

        // Verify followee exists in auth service
        GetUserByIdResponse followeeResponse = userServiceStub.getUserById(
                GetUserByIdRequest.newBuilder().setUserId(followeeId).build()
        );
        if (!followeeResponse.getFound()) {
            throw new IllegalArgumentException("Followee user not found.");
        }

        User follower = userRepository.findById(followerId)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUserId(followerId);
                    return userRepository.save(u);
                });

        User followee = userRepository.findById(followeeId)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUserId(followeeId);
                    return userRepository.save(u);
                });

        follower.getFollowing().add(new Follows(followee));
        userRepository.save(follower);
    }

    @Transactional
    public void unfollow(String followerId, String followeeId) {
        if (!userRepository.alreadyFollows(followerId, followeeId)) {
            throw new IllegalStateException("Not following this user.");
        }
        userRepository.deleteFollows(followerId, followeeId);
    }

    public List<String> getFollowing(String userId) {
        return userRepository.findWithFollowingByUserId(userId)
                .map(u -> u.getFollowing().stream()
                        .map(f -> f.getTarget().getUserId())
                        .toList())
                .orElse(List.of());
    }

    public List<String> getFollowers(String userId) {
        return userRepository.findFollowingIds(userId);
    }

    public List<String> getRecommendations(String userId) {
        return userRepository.findRecommendations(userId);
    }
}
