package com.selfforge.discipline.coach;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiCoachUsageRepository extends JpaRepository<AiCoachUsage, Long> {
    Optional<AiCoachUsage> findByUserIdAndUsageMonthAndFeature(Long userId, LocalDate usageMonth, AiCoachFeature feature);
}
