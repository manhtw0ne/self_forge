package com.selfforge.discipline.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByUserIdAndActiveFalseOrderByCreatedAtDesc(Long userId);

    boolean existsByCategoryId(Long categoryId);

    long countByUserIdAndActiveTrue(Long userId);

    boolean existsByUserId(Long userId);

    /**
     * Used by aggregate beta reporting so a historical report never counts a
     * habit that was only created after its selected reporting window.
     */
    boolean existsByUserIdAndCreatedAtLessThan(Long userId, Instant before);

    boolean existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(Long userId, Instant from, Instant before);

    List<Habit> findByActiveTrueOrderByCreatedAtAsc();

    List<Habit> findByUserIdAndActiveTrueOrderByCreatedAtAsc(Long userId);

    List<Habit> findByUserIdOrderByCreatedAtDesc(Long userId);
}
