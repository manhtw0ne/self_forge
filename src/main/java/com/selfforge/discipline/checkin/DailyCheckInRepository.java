package com.selfforge.discipline.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DailyCheckInRepository extends JpaRepository<DailyCheckIn, Long> {
    boolean existsByHabit_User_IdAndStatusAndDateLessThanEqual(Long userId,CheckInStatus status,LocalDate through);
    boolean existsByHabit_User_IdAndStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(Long userId, CheckInStatus status, Instant from, Instant to);
    boolean existsByHabit_User_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(Long userId, Instant from, Instant to);
    @org.springframework.data.jpa.repository.Query("select c from DailyCheckIn c join fetch c.habit h where h.user.id=:owner and c.date between :start and :end and c.status in :statuses and locate(lower(:query),lower(concat(h.name,' ',coalesce(c.note,''))))>0 and (c.date<:beforeDate or (c.date=:beforeDate and c.id<:beforeId)) order by c.date desc,c.id desc")
    List<DailyCheckIn> searchHistory(@org.springframework.data.repository.query.Param("owner") Long owner,@org.springframework.data.repository.query.Param("start") LocalDate start,@org.springframework.data.repository.query.Param("end") LocalDate end,@org.springframework.data.repository.query.Param("statuses") List<CheckInStatus> statuses,@org.springframework.data.repository.query.Param("query") String query,@org.springframework.data.repository.query.Param("beforeDate") LocalDate beforeDate,@org.springframework.data.repository.query.Param("beforeId") Long beforeId,org.springframework.data.domain.Pageable page);

    @org.springframework.data.jpa.repository.Query("select c from DailyCheckIn c join fetch c.habit h left join fetch h.category where h.user.id=:owner and c.date between :start and :end order by c.date,c.id")
    List<DailyCheckIn> categoryActivity(@org.springframework.data.repository.query.Param("owner") Long owner,@org.springframework.data.repository.query.Param("start") LocalDate start,@org.springframework.data.repository.query.Param("end") LocalDate end);


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
