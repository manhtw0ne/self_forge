package com.selfforge.discipline.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalRepository extends JpaRepository<JournalEntry, Long> {
    boolean existsByUserIdAndDateLessThanEqual(Long userId,LocalDate through);

    @Query("select j from JournalEntry j where j.user.id=:userId and j.date>=:fromDate and j.date<=:through and j.date<:before and (((:field='ALL' or :field='win') and locate(lower(:term),lower(coalesce(j.win,'')))>0) or ((:field='ALL' or :field='obstacle') and locate(lower(:term),lower(coalesce(j.obstacle,'')))>0) or ((:field='ALL' or :field='lesson') and locate(lower(:term),lower(coalesce(j.lesson,'')))>0) or ((:field='ALL' or :field='tomorrowFocus') and locate(lower(:term),lower(coalesce(j.tomorrowFocus,'')))>0)) order by j.date desc")
    List<JournalEntry> search(@org.springframework.data.repository.query.Param("userId") Long userId,@org.springframework.data.repository.query.Param("term") String term,@org.springframework.data.repository.query.Param("field") String field,@org.springframework.data.repository.query.Param("before") LocalDate before,@org.springframework.data.repository.query.Param("through") LocalDate through,@org.springframework.data.repository.query.Param("fromDate") LocalDate fromDate,org.springframework.data.domain.Pageable pageable);

    Optional<JournalEntry> findByDate(LocalDate date);

    Optional<JournalEntry> findByUserIdAndDate(Long userId, LocalDate date);

    @Query("SELECT j.date FROM JournalEntry j WHERE j.user.id = :userId ORDER BY j.date DESC")
    List<LocalDate> findDatesByUserId(Long userId);

    List<JournalEntry> findByUserIdAndDateBetweenOrderByDateAsc(Long userId,LocalDate start,LocalDate end);

    List<JournalEntry> findByUserIdOrderByDateDesc(Long userId);
}
