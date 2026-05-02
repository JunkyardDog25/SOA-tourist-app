package com.soa.blogService.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CreateBlogRequestDto {

    @NotBlank
    private String title;

    @NotBlank
    private String description;

    private List<String> imageUrls;
}
