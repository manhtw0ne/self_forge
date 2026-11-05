package com.selfforge.discipline.feedback;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackSubmissionRepository extends JpaRepository<FeedbackSubmission, Long> {
    long countByUser_IdAndCreatedAtGreaterThanEqual(Long userId, Instant createdAt);
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant from, Instant to);
    List<FeedbackSubmission> findTop20ByUser_IdOrderByIdDesc(Long userId);
    long deleteByIdAndUser_Id(Long id, Long userId);

    @Query("""
            select submission from FeedbackSubmission submission
            where (:status is null or submission.operatorStatus = :status)
              and (:beforeId is null or submission.id < :beforeId)
            order by submission.id desc
            """)
    List<FeedbackSubmission> findOperatorPage(@Param("status") FeedbackReviewStatus status,
                                               @Param("beforeId") Long beforeId,
                                               Pageable pageable);
}
