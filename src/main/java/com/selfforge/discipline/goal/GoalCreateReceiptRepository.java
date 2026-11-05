package com.selfforge.discipline.goal;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalCreateReceiptRepository extends JpaRepository<GoalCreateReceipt, Long> {
    Optional<GoalCreateReceipt> findByUserIdAndRequestId(Long userId, String requestId);
}
