package com.selfforge.discipline.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByUserIdOrderByReminderTimeAsc(Long userId);

    List<Reminder> findByUserIdAndEnabledTrueOrderByReminderTimeAsc(Long userId);

    Optional<Reminder> findByIdAndUserId(Long id, Long userId);
}
