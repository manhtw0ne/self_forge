package com.selfforge.discipline.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByActiveTrueOrderByCreatedAtAsc();

    List<Habit> findByUserIdAndActiveTrueOrderByCreatedAtAsc(Long userId);

    List<Habit> findByUserIdOrderByCreatedAtDesc(Long userId);
}
