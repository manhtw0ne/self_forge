package com.selfforge.discipline.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DailyCheckInRepository extends JpaRepository<DailyCheckIn, Long> {

    List<DailyCheckIn> findByHabit_User_IdAndHabitIdAndDateBetween(Long userId, Long habitId, LocalDate start, LocalDate end);
    Optional<DailyCheckIn> findByHabitIdAndDate(Long habitId, LocalDate date);

    Optional<DailyCheckIn> findByHabit_User_IdAndHabitIdAndDate(Long userId, Long habitId, LocalDate date);

    List<DailyCheckIn> findByDateOrderByCreatedAtAsc(LocalDate date);

    List<DailyCheckIn> findByHabit_User_IdAndDateOrderByCreatedAtAsc(Long userId, LocalDate date);

    List<DailyCheckIn> findByDateBetweenOrderByDateAsc(LocalDate start, LocalDate end);

    List<DailyCheckIn> findByHabit_User_IdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);

    List<DailyCheckIn> findByHabitIdAndStatusAndDateBetween(Long habitId, CheckInStatus status, LocalDate start, LocalDate end);

    List<DailyCheckIn> findByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
            Long userId,
            Long habitId,
            CheckInStatus status,
            LocalDate start,
            LocalDate end
    );

    int countByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
            Long userId,
            Long habitId,
            CheckInStatus status,
            LocalDate start,
            LocalDate end
    );

    List<DailyCheckIn> findByHabitIdAndStatusAndDateIn(Long habitId, CheckInStatus status, Collection<LocalDate> dates);

    List<DailyCheckIn> findByHabit_User_IdAndHabitIdAndStatusAndDateIn(
            Long userId,
            Long habitId,
            CheckInStatus status,
            Collection<LocalDate> dates
    );
}
