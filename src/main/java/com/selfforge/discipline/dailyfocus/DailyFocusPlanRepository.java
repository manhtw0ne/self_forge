package com.selfforge.discipline.dailyfocus;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface DailyFocusPlanRepository extends JpaRepository<DailyFocusPlan, Long> {
    Optional<DailyFocusPlan> findByUserIdAndPlanDate(Long userId, LocalDate planDate);
}
