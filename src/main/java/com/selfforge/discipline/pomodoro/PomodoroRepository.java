package com.selfforge.discipline.pomodoro;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PomodoroRepository extends JpaRepository<PomodoroSession, Long> {
    interface HabitFocusTotals {Long getSessions();Long getMinutes();}
    @org.springframework.data.jpa.repository.Query("select count(s) as sessions, coalesce(sum(s.durationMinutes),0) as minutes from PomodoroSession s where s.user.id=:userId and s.habit.id=:habitId and s.habit.user.id=:userId and s.completed=true and s.durationMinutes between 25 and 120 and s.startedAt>=:from and s.startedAt<:to")
    HabitFocusTotals habitFocusTotals(@org.springframework.data.repository.query.Param("userId") Long userId,@org.springframework.data.repository.query.Param("habitId") Long habitId,@org.springframework.data.repository.query.Param("from") Instant from,@org.springframework.data.repository.query.Param("to") Instant to);


    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "habit")
    @org.springframework.data.jpa.repository.Query("select s from PomodoroSession s where s.user.id = :userId and (:beforeId is null or s.id < :beforeId) and (:completed is null or s.completed = :completed) and s.startedAt>=:from and s.startedAt<:to and (:term = '' or locate(lower(:term), lower(coalesce(s.note, ''))) > 0) order by s.id desc")
    List<PomodoroSession> history(@org.springframework.data.repository.query.Param("userId") Long userId,
                                 @org.springframework.data.repository.query.Param("beforeId") Long beforeId,
                                 @org.springframework.data.repository.query.Param("completed") Boolean completed,
                                 @org.springframework.data.repository.query.Param("from") Instant from, @org.springframework.data.repository.query.Param("to") Instant to, @org.springframework.data.repository.query.Param("term") String term, org.springframework.data.domain.Pageable pageable);

    interface HistoryTotals {Long getTotal();Long getCompleted();Long getTimedSessions();Long getMinutes();}
    @org.springframework.data.jpa.repository.Query("select count(s) as total, coalesce(sum(case when s.completed=true then 1 else 0 end),0) as completed, coalesce(sum(case when s.completed=true and s.durationMinutes between 25 and 120 then 1 else 0 end),0) as timedSessions, coalesce(sum(case when s.completed=true and s.durationMinutes between 25 and 120 then s.durationMinutes else 0 end),0) as minutes from PomodoroSession s where s.user.id=:userId and (:completed is null or s.completed=:completed) and s.startedAt>=:from and s.startedAt<:to and (:term='' or locate(lower(:term),lower(coalesce(s.note,'')))>0)")
    HistoryTotals historyTotals(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("completed") Boolean completed, @org.springframework.data.repository.query.Param("from") Instant from, @org.springframework.data.repository.query.Param("to") Instant to, @org.springframework.data.repository.query.Param("term") String term);

    java.util.Optional<PomodoroSession> findByUserIdAndStartRequestId(Long userId, String startRequestId);

    boolean existsByUserIdAndCompletedTrueAndEndedAtAfter(Long userId, Instant startedAt);

    List<PomodoroSession> findTop20ByUserIdOrderByStartedAtDesc(Long userId);

    List<PomodoroSession> findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(Long userId, Instant from, Instant to);
}
