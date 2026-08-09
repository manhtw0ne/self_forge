package com.selfforge.discipline.category;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.selfforge.discipline.category.CategoryRequests.CreateCategoryRequest;
import static com.selfforge.discipline.category.CategoryRequests.UpdateCategoryRequest;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(AppUser user) {
        return categoryRepository.findByUserIsNullOrUserIdOrderByNameAsc(user.getId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse create(AppUser user, CreateCategoryRequest request) {
        Category category = new Category(
                request.name(),
                request.color(),
                request.icon(),
                user
        );
        return CategoryResponse.from(categoryRepository.save(category));
    }

    public CategoryResponse update(AppUser user, Long id, UpdateCategoryRequest request) {
        Category category = getCategory(user, id);
        category.update(request.name(), request.color(), request.icon());
        return CategoryResponse.from(category);
    }

    public void delete(AppUser user, Long id) {
        Category category = getCategory(user, id);
        if (category.isSystemDefault()) {
            throw new IllegalArgumentException("Cannot delete a system default category");
        }
        categoryRepository.delete(category);
    }

    @Transactional(readOnly = true)
    public Category getById(Long id) {
        if (id == null) return null;
        return categoryRepository.findById(id).orElse(null);
    }

    private Category getCategory(AppUser user, Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category " + id + " does not exist"));
        if (!category.isSystemDefault() && !category.getUser().getId().equals(user.getId())) {
            throw new EntityNotFoundException("Category " + id + " does not exist");
        }
        return category;
    }
}
