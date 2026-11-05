package com.selfforge.discipline.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "habit")
    List<Reminder> findByUserIdOrderByReminderTimeAsc(Long userId);

    List<Reminder> findByUserIdAndEnabledTrueOrderByReminderTimeAsc(Long userId);

    Optional<Reminder> findByIdAndUserId(Long id, Long userId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from Reminder r where r.id = :id and r.user.id = :userId")
    Optional<Reminder> lockByIdAndUserId(@org.springframework.data.repository.query.Param("id") Long id,
            @org.springframework.data.repository.query.Param("userId") Long userId);
}
