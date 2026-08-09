package com.selfforge.discipline.reminder;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.selfforge.discipline.reminder.ReminderRequests.CreateReminderRequest;
import static com.selfforge.discipline.reminder.ReminderRequests.UpdateReminderRequest;

@Service
@Transactional
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final HabitService habitService;

    public ReminderService(ReminderRepository reminderRepository, HabitService habitService) {
        this.reminderRepository = reminderRepository;
        this.habitService = habitService;
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> list(AppUser user) {
        return reminderRepository.findByUserIdOrderByReminderTimeAsc(user.getId()).stream()
                .map(ReminderResponse::from)
                .toList();
    }

    public ReminderResponse create(AppUser user, CreateReminderRequest request) {
        Habit habit = habitService.getHabit(user, request.habitId());
        Reminder reminder = new Reminder(
                user, habit,
                request.reminderTime(),
                request.daysOfWeek(),
                request.message()
        );
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    public ReminderResponse update(AppUser user, Long id, UpdateReminderRequest request) {
        Reminder reminder = getReminder(user, id);
        reminder.update(
                request.reminderTime(),
                request.daysOfWeek(),
                request.message(),
                request.enabled()
        );
        return ReminderResponse.from(reminder);
    }

    public void delete(AppUser user, Long id) {
        Reminder reminder = getReminder(user, id);
        reminderRepository.delete(reminder);
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getDueReminders(AppUser user) {
        LocalTime now = LocalTime.now();
        String todayDay = dayOfWeekCode(LocalDate.now().getDayOfWeek());
        LocalTime windowStart = now.minusMinutes(30);

        return reminderRepository.findByUserIdAndEnabledTrueOrderByReminderTimeAsc(user.getId()).stream()
                .filter(r -> {
                    Set<String> days = Arrays.stream(r.getDaysOfWeek().split(","))
                            .map(String::trim)
                            .collect(Collectors.toSet());
                    if (!days.contains(todayDay)) return false;
                    LocalTime rTime = r.getReminderTime();
                    return !rTime.isBefore(windowStart) && !rTime.isAfter(now);
                })
                .map(ReminderResponse::from)
                .toList();
    }

    private Reminder getReminder(AppUser user, Long id) {
        return reminderRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reminder " + id + " does not exist"));
    }

    private String dayOfWeekCode(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY -> "MON";
            case TUESDAY -> "TUE";
            case WEDNESDAY -> "WED";
            case THURSDAY -> "THU";
            case FRIDAY -> "FRI";
            case SATURDAY -> "SAT";
            case SUNDAY -> "SUN";
        };
    }
}
