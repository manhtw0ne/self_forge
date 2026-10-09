package com.selfforge.discipline.challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ChallengeCreateReceiptRepository extends JpaRepository<ChallengeCreateReceipt, Long> {
    Optional<ChallengeCreateReceipt> findByUserIdAndRequestId(Long userId, String requestId);
}
