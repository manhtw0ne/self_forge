package com.selfforge.discipline.coach;

import java.time.LocalDate;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyCoachAdviceRepository extends JpaRepository<WeeklyCoachAdvice, Long> {
    Optional<WeeklyCoachAdvice> findByUserIdAndWeekStartAndLanguageAndEvidenceFingerprint(
            Long userId, LocalDate weekStart, String language, String evidenceFingerprint);

    long deleteByUserIdAndWeekStartAndLanguageAndEvidenceFingerprint(
            Long userId, LocalDate weekStart, String language, String evidenceFingerprint);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant from, Instant through);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndHelpfulnessRatingIsNotNull(Instant from, Instant through);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndFollowUpDecision(
            Instant from, Instant through, WeeklyCoachFeedbackDecision decision);
}
