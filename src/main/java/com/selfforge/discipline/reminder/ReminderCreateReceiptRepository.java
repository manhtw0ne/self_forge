package com.selfforge.discipline.reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ReminderCreateReceiptRepository extends JpaRepository<ReminderCreateReceipt, Long> {
    Optional<ReminderCreateReceipt> findByUserIdAndRequestId(Long userId, String requestId);
}
