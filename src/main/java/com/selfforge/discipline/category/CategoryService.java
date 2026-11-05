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
    private final com.selfforge.discipline.auth.AppUserRepository users;
    private final com.selfforge.discipline.habit.HabitRepository habits;

    public CategoryService(CategoryRepository categoryRepository, com.selfforge.discipline.auth.AppUserRepository users, com.selfforge.discipline.habit.HabitRepository habits) {
        this.users = users; this.habits = habits;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(AppUser user) {
        return categoryRepository.findByUserIsNullOrUserIdOrderByNameAsc(user.getId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse create(AppUser user, CreateCategoryRequest request) {
        users.lockById(user.getId()).orElseThrow();
        String name=request.name().trim(),color=request.color()==null?"":request.color(),icon=request.icon()==null?"":request.icon().trim();
        var existing=categoryRepository.findFirstByUserIdAndNameAndColorAndIcon(user.getId(),name,color,icon);
        if(existing.isPresent())return CategoryResponse.from(existing.get());
        return CategoryResponse.from(categoryRepository.save(new Category(name,color,icon,user)));
    }

    public CategoryResponse update(AppUser user, Long id, UpdateCategoryRequest request) {
        users.lockById(user.getId()).orElseThrow();
        Category category = getCategory(user, id);
        if (category.isSystemDefault()) throw new IllegalArgumentException("Cannot edit a system default category");
        String name=request.name()==null||request.name().isBlank()?category.getName():request.name().trim();
        String color=request.color()==null?category.getColor():request.color(),icon=request.icon()==null?category.getIcon():request.icon().trim();
        if(matches(category,name,color,icon))return CategoryResponse.from(category);
        if(request.expected()!=null&&!matches(category,request.expected().name(),request.expected().color(),request.expected().icon()))throw new IllegalStateException("Danh mục đã thay đổi. Tải lại danh sách và kiểm tra trước khi sửa tiếp.");
        category.update(name,color,icon);
        return CategoryResponse.from(category);
    }
    private boolean matches(Category category,String name,String color,String icon){
        return java.util.Objects.equals(category.getName(),name)&&java.util.Objects.equals(category.getColor(),color)&&java.util.Objects.equals(category.getIcon(),icon);
    }

    public void delete(AppUser user, Long id) {
        users.lockById(user.getId()).orElseThrow();
        Category category = getCategory(user, id);
        if (category.isSystemDefault()) {
            throw new IllegalArgumentException("Cannot delete a system default category");
        }
        if (habits.existsByCategoryId(id)) throw new IllegalStateException("Category is used by habits; remove those assignments before deleting it");
        categoryRepository.delete(category);
    }

    @Transactional(readOnly = true)
    public Category getById(AppUser user, Long id) {
        if (id == null) return null;
        return getCategory(user, id);
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
