package com.selfforge.discipline.category;

import jakarta.validation.constraints.NotBlank;

public final class CategoryRequests {

    private CategoryRequests() {
    }

    public record CreateCategoryRequest(
            @NotBlank String name,
            String color,
            String icon
    ) {
    }

    public record UpdateCategoryRequest(
            String name,
            String color,
            String icon
    ) {
    }
}
