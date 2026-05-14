package com.soa.followersService.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FollowRequest {

    @NotBlank
    private String followeeId;
}
