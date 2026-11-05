package com.selfforge.discipline.companion;

public interface CompanionMilestoneAckRepository extends org.springframework.data.jpa.repository.JpaRepository<CompanionMilestoneAck,Long>{
 boolean existsByUserIdAndStage(Long userId,int stage);
}
