package com.selfforge.discipline.reward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RewardCreateReceiptRepository extends JpaRepository<RewardCreateReceipt,Long> {
    Optional<RewardCreateReceipt> findByUserIdAndRequestId(Long userId,String requestId);
}
