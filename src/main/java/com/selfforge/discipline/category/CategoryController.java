package com.selfforge.discipline.category;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.selfforge.discipline.category.CategoryRequests.CreateCategoryRequest;
import static com.selfforge.discipline.category.CategoryRequests.UpdateCategoryRequest;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final CurrentUserService currentUserService;

    public CategoryController(CategoryService categoryService, CurrentUserService currentUserService) {
        this.categoryService = categoryService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<CategoryResponse> list(HttpServletRequest servletRequest) {
        return categoryService.list(currentUserService.requireUser(servletRequest));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CreateCategoryRequest request, HttpServletRequest servletRequest) {
        return categoryService.create(currentUserService.requireUser(servletRequest), request);
    }

    @PatchMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody UpdateCategoryRequest request, HttpServletRequest servletRequest) {
        return categoryService.update(currentUserService.requireUser(servletRequest), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        categoryService.delete(currentUserService.requireUser(servletRequest), id);
    }
}
