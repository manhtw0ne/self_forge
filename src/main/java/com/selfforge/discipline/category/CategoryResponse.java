package com.selfforge.discipline.category;

import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        String color,
        String icon,
        boolean systemDefault,
        Instant createdAt
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getIcon(),
                category.isSystemDefault(),
                category.getCreatedAt()
        );
    }
}
