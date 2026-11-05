package com.selfforge.discipline.habit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface HabitStateHistoryRepository extends JpaRepository<HabitStateHistory, Long> {
    @Query("select case when count(h)>0 then true else false end from HabitStateHistory h where h.habit.id=:habitId")
    boolean existsByHabitId(@Param("habitId") Long habitId);

    /**
     * State changes take effect for the account calendar date on which they
     * were recorded.  The ID makes repeated edits on one date deterministic.
     * There deliberately is no inferred row before recording began: legacy
     * habits have no trustworthy historical schedule.
     */
    @Query("select h from HabitStateHistory h where h.habit.id=:habitId and h.calendarDate<=:date " +
            "order by h.calendarDate desc, h.id desc")
    List<HabitStateHistory> latestOnOrBefore(@Param("habitId") Long habitId,
                                             @Param("date") java.time.LocalDate date,
                                             Pageable page);

    List<HabitStateHistory> findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(Long habitId,
                                                                                                        java.time.LocalDate date);

    /**
     * Fetches every date-eligible state in one query. Callers resolve the
     * recorded-time timeline instead of treating the first calendar-sorted row
     * as authoritative, because a timezone change can move a later action to
     * an earlier calendar date.
     */
    @Query("select h from HabitStateHistory h where h.habit.id in :habitIds and h.calendarDate<=:date " +
            "order by h.habit.id asc, h.calendarDate desc, h.id desc")
    List<HabitStateHistory> statesOnOrBefore(@Param("habitIds") List<Long> habitIds,
                                              @Param("date") java.time.LocalDate date);

    @Query("select h from HabitStateHistory h where h.habit.user.id=:userId and h.habit.id=:habitId " +
            "and (:beforeId is null or h.id<:beforeId) order by h.id desc")
    List<HabitStateHistory> history(@Param("userId") Long userId, @Param("habitId") Long habitId,
                                   @Param("beforeId") Long beforeId, Pageable page);
}
