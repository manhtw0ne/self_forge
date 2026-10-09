package com.selfforge.discipline.habit;
public interface HabitBatchReceiptRepository extends org.springframework.data.jpa.repository.JpaRepository<HabitBatchReceipt, Long> {
    java.util.Optional<HabitBatchReceipt> findByUserIdAndRequestId(Long userId, String requestId);
}
