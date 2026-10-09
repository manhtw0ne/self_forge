package com.selfforge.discipline.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByUserIdAndActiveFalseOrderByCreatedAtDesc(Long userId);

    boolean existsByCategoryId(Long categoryId);

    long countByUserIdAndActiveTrue(Long userId);

    List<Habit> findByActiveTrueOrderByCreatedAtAsc();

    List<Habit> findByUserIdAndActiveTrueOrderByCreatedAtAsc(Long userId);

    List<Habit> findByUserIdOrderByCreatedAtDesc(Long userId);
}
