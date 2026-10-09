package com.selfforge.discipline.penalty;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {
    List<Penalty> findByCheckInIdAndReversedFalse(Long checkInId);

    List<Penalty> findByUserIdOrderByDateDesc(Long userId);

    List<Penalty> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDate start, LocalDate end);

    int countByUserId(Long userId);
}
