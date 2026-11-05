package com.selfforge.discipline.category;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
public final class CategoryRequests {
 private CategoryRequests(){}
 public record CreateCategoryRequest(@NotBlank @Size(max=255) String name,
     @Size(max=7) @Pattern(regexp="^$|#[0-9a-fA-F]{6}") String color,@Size(max=32) String icon){}
 public record ExpectedCategory(@NotBlank @Size(max=255) String name,@Size(max=255) String color,@Size(max=255) String icon){}
 public record UpdateCategoryRequest(@Size(max=255) String name,
     @Size(max=7) @Pattern(regexp="^$|#[0-9a-fA-F]{6}") String color,@Size(max=32) String icon,@Valid ExpectedCategory expected){}
}
