package com.selfforge.discipline.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeeklyReviewRepository extends JpaRepository<WeeklyReview, Long> {

    Optional<WeeklyReview> findByUserIdAndWeekStart(Long userId, LocalDate weekStart);

    List<WeeklyReview> findByUserIdOrderByWeekStartDesc(Long userId);
}
