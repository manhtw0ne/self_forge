package com.selfforge.discipline.payment;

import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
    Optional<PaymentEvent> findByProviderAndExternalId(String provider, String externalId);

    @Query("""
            select event from PaymentEvent event left join fetch event.order
            where event.disposition = com.selfforge.discipline.payment.PaymentEventDisposition.REVIEW
              and (:beforeId is null or event.id < :beforeId)
            order by event.id desc
            """)
    List<PaymentEvent> findReviewPage(@Param("beforeId") Long beforeId, Pageable pageable);
}
