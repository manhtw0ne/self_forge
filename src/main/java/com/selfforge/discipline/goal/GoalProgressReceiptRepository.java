package com.selfforge.discipline.goal;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GoalProgressReceiptRepository extends JpaRepository<GoalProgressReceipt, Long> {
    Optional<GoalProgressReceipt> findByGoalIdAndRequestKey(Long goalId, String requestKey);
    void deleteByGoalId(Long goalId);
}