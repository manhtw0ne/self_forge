package com.selfforge.discipline.coach;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalCoachPlanRepository extends JpaRepository<GoalCoachPlan, Long> {
    Optional<GoalCoachPlan> findByUserIdAndGoalIdAndLanguageAndEvidenceFingerprint(
            Long userId, Long goalId, String language, String evidenceFingerprint);

    long deleteByUserIdAndGoalIdAndLanguageAndEvidenceFingerprint(
            Long userId, Long goalId, String language, String evidenceFingerprint);

    long deleteByUserIdAndGoalIdAndEvidenceFingerprintNot(Long userId, Long goalId, String evidenceFingerprint);
}
