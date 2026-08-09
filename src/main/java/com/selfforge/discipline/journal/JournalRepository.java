package com.selfforge.discipline.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalRepository extends JpaRepository<JournalEntry, Long> {

    Optional<JournalEntry> findByDate(LocalDate date);

    Optional<JournalEntry> findByUserIdAndDate(Long userId, LocalDate date);

    @Query("SELECT j.date FROM JournalEntry j WHERE j.user.id = :userId ORDER BY j.date DESC")
    List<LocalDate> findDatesByUserId(Long userId);
}
