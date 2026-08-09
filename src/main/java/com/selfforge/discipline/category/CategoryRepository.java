package com.selfforge.discipline.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUserIsNullOrUserIdOrderByNameAsc(Long userId);

    List<Category> findByUserIsNullOrderByNameAsc();

    boolean existsByNameAndUserIsNull(String name);
}
