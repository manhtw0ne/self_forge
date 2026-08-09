package com.selfforge.discipline.category;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class CategoryDataLoader {

    @Bean
    @Order(0)
    CommandLineRunner loadCategories(CategoryRepository categoryRepository) {
        return args -> {
            createIfMissing(categoryRepository, "Sức khỏe", "#4CAF50", "💪");
            createIfMissing(categoryRepository, "Học tập", "#2196F3", "📚");
            createIfMissing(categoryRepository, "Công việc", "#FF9800", "💼");
            createIfMissing(categoryRepository, "Tinh thần", "#9C27B0", "🧘");
            createIfMissing(categoryRepository, "Tài chính", "#F44336", "💰");
            createIfMissing(categoryRepository, "Xã hội", "#00BCD4", "🤝");
        };
    }

    private void createIfMissing(CategoryRepository repo, String name, String color, String icon) {
        if (!repo.existsByNameAndUserIsNull(name)) {
            repo.save(new Category(name, color, icon, null));
        }
    }
}
