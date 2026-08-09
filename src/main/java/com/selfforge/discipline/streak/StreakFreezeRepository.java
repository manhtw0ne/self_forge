package com.selfforge.discipline.streak;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StreakFreezeRepository extends JpaRepository<StreakFreeze, Long> {

    int countByUserIdAndFreezeDateBetween(Long userId, LocalDate start, LocalDate end);

    Optional<StreakFreeze> findByUserIdAndHabitIdAndFreezeDate(Long userId, Long habitId, LocalDate date);

    List<StreakFreeze> findByUserIdAndFreezeDateBetweenOrderByFreezeDateDesc(Long userId, LocalDate start, LocalDate end);

    boolean existsByUserIdAndHabitIdAndFreezeDate(Long userId, Long habitId, LocalDate date);
}
