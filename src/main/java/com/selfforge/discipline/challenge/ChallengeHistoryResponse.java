package com.selfforge.discipline.challenge;
import java.time.LocalDate;
import java.util.List;
import com.selfforge.discipline.checkin.CheckInStatus;
public record ChallengeHistoryResponse(Long challengeId, Long habitId, LocalDate startDate, LocalDate endDate, List<Entry> entries) {
 public record Entry(Long id, LocalDate date, CheckInStatus status) {}
}
