package com.selfforge.discipline.mood;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MoodRepository extends JpaRepository<MoodEntry, Long> {

    Optional<MoodEntry> findByUserIdAndDate(Long userId, LocalDate date);

    List<MoodEntry> findByUserIdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);

    List<MoodEntry> findByUserIdOrderByDateDesc(Long userId);
}
