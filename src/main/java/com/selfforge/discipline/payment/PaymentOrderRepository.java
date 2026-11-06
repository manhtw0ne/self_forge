package com.selfforge.discipline.payment;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {
    boolean existsByReference(String reference);
    Optional<PaymentOrder> findByReferenceAndUser_Id(String reference, Long userId);
    Optional<PaymentOrder> findFirstByUser_IdAndStatusOrderByCreatedAtDesc(Long userId, PaymentOrderStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from PaymentOrder o join fetch o.user where o.reference = :reference")
    Optional<PaymentOrder> lockByReference(@Param("reference") String reference);
}
