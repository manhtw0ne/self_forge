package com.selfforge.discipline.challenge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "habit")
    List<Challenge> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Challenge> findByUserIdAndHabitIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long userId, Long habitId, java.time.LocalDate startBound, java.time.LocalDate endBound);

    Optional<Challenge> findByIdAndUserId(Long id, Long userId);
}
