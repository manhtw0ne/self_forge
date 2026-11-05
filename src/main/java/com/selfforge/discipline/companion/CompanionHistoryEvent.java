package com.selfforge.discipline.companion;
import com.selfforge.discipline.checkin.CheckInStatus;import java.time.*;
public record CompanionHistoryEvent(Long id,Long checkInId,String habitName,LocalDate date,Instant changedAt,CheckInStatus fromStatus,CheckInStatus toStatus,Integer points){}
