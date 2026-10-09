package com.selfforge.discipline.streak;

import com.selfforge.discipline.checkin.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StreakService {
    private final DailyCheckInRepository checkIns;
    private final StreakFreezeRepository freezes;

    public StreakService(DailyCheckInRepository checkIns, StreakFreezeRepository freezes) {
        this.checkIns = checkIns;
        this.freezes = freezes;
    }

    public int current(Long userId, Long habitId, LocalDate today) {
        return count(userId, habitId, today, true);
    }

    public int endingOn(Long userId, Long habitId, LocalDate date) {
        return count(userId, habitId, date, false);
    }

    private int count(Long userId, Long habitId, LocalDate end, boolean openDayGrace) {
        int completed = 0;
        boolean firstDay = true;
        while (true) {
            LocalDate start = end.toEpochDay() - LocalDate.MIN.toEpochDay() < 127
                    ? LocalDate.MIN : end.minusDays(127);
            Map<LocalDate, CheckInStatus> statuses = new HashMap<>();
            checkIns.findByHabit_User_IdAndHabitIdAndDateBetween(userId, habitId, start, end)
                    .forEach(checkIn -> statuses.put(checkIn.getDate(), checkIn.getStatus()));
            Set<LocalDate> frozen = freezes.findByUserIdAndHabitIdAndFreezeDateBetween(userId, habitId, start, end)
                    .stream().map(StreakFreeze::getFreezeDate).collect(Collectors.toSet());
            LocalDate cursor = end;
            while (true) {
                CheckInStatus status = statuses.get(cursor);
                if (status == CheckInStatus.COMPLETED) completed++;
                else if (!frozen.contains(cursor) && !(firstDay && openDayGrace && status == null)) return completed;
                firstDay = false;
                if (cursor.equals(start)) break;
                cursor = cursor.minusDays(1);
            }
            if (start.equals(LocalDate.MIN)) return completed;
            end = start.minusDays(1);
        }
    }
}