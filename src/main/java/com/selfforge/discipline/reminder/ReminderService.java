package com.selfforge.discipline.reminder;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitSchedule;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.habit.HabitStateHistory;
import com.selfforge.discipline.habit.HabitStateTimeline;
import com.selfforge.discipline.habit.HabitStateHistoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.selfforge.discipline.reminder.ReminderRequests.CreateReminderRequest;
import static com.selfforge.discipline.reminder.ReminderRequests.UpdateReminderRequest;

@Service
@Transactional
public class ReminderService {

    private final UserTime userTime;
    private final com.selfforge.discipline.auth.AppUserRepository users;
    private final ReminderCreateReceiptRepository receipts;
    private final com.fasterxml.jackson.databind.ObjectMapper json;

    private final ReminderRepository reminderRepository;
    private final HabitService habitService;
    private final HabitStateHistoryRepository stateHistory;

    public ReminderService(ReminderRepository reminderRepository, HabitService habitService, UserTime userTime,
                           com.selfforge.discipline.auth.AppUserRepository users, ReminderCreateReceiptRepository receipts,
                           com.fasterxml.jackson.databind.ObjectMapper json, HabitStateHistoryRepository stateHistory) {
        this.userTime = userTime;
        this.users = users; this.receipts = receipts; this.json = json;
        this.reminderRepository = reminderRepository;
        this.habitService = habitService;
        this.stateHistory = stateHistory;
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> list(AppUser user) {
        return reminderRepository.findByUserIdOrderByReminderTimeAsc(user.getId()).stream()
                .map(ReminderResponse::from)
                .toList();
    }

    public ReminderResponse create(AppUser user, CreateReminderRequest request) {
        users.lockById(user.getId()).orElseThrow();
        String fingerprint = fingerprint(request);
        if (request.requestId() != null) {
            var prior = receipts.findByUserIdAndRequestId(user.getId(), request.requestId().toString());
            if (prior.isPresent()) {
                if (!prior.get().getFingerprint().equals(fingerprint)) throw new IllegalStateException("Mã yêu cầu đã được dùng cho lịch nhắc khác.");
                return reminderRepository.findByIdAndUserId(prior.get().getReminderId(), user.getId())
                        .map(ReminderResponse::from).orElseThrow(() -> new IllegalStateException("Lịch nhắc của yêu cầu này đã bị xóa."));
            }
        }
        Habit habit = habitService.getActiveHabit(user, request.habitId());
        requireHabitSchedule(habit, request.daysOfWeek());
        Reminder reminder = new Reminder(
                user, habit,
                request.reminderTime(),
                request.daysOfWeek(),
                request.message()
        );
        reminderRepository.save(reminder);
        if (request.requestId() != null) receipts.save(new ReminderCreateReceipt(user.getId(), request.requestId().toString(), fingerprint, reminder.getId()));
        return ReminderResponse.from(reminder);
    }

    @Transactional(readOnly=true)
    public ReminderResponse get(AppUser user,Long id){return ReminderResponse.from(reminderRepository.findByIdAndUserId(id,user.getId()).orElseThrow(()->new EntityNotFoundException("Reminder not found")));}
    private static String message(String value){return value==null?"":value;}
    private boolean matches(Reminder reminder,LocalTime time,String days,String text,boolean enabled){return reminder.getReminderTime().equals(time)&&reminder.getDaysOfWeek().equals(days)&&message(reminder.getMessage()).equals(message(text))&&reminder.isEnabled()==enabled;}
    public ReminderResponse update(AppUser user, Long id, UpdateReminderRequest request) {
        Reminder reminder = getReminder(user, id);
        var time=request.reminderTime()==null?reminder.getReminderTime():request.reminderTime();
        var days=request.daysOfWeek()==null?reminder.getDaysOfWeek():request.daysOfWeek();
        var text=request.message()==null?reminder.getMessage():request.message();
        boolean enabled=request.enabled()==null?reminder.isEnabled():request.enabled();
        if(matches(reminder,time,days,text,enabled))return ReminderResponse.from(reminder);
        if(request.expected()!=null){var expected=request.expected();if(!matches(reminder,expected.reminderTime(),expected.daysOfWeek(),expected.message(),expected.enabled()))throw new IllegalStateException("Lịch nhắc đã thay đổi. Xem bản mới trước khi lưu tiếp.");}
        // Existing legacy schedules remain readable and can still be toggled.
        // Any explicit weekday edit must stay within the habit's current schedule.
        if (request.daysOfWeek() != null) requireHabitSchedule(reminder.getHabit(), request.daysOfWeek());
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
        var now = userTime.now(user);
        var windowStart = now.toInstant().minusSeconds(30 * 60);
        var reminders = reminderRepository.findByUserIdAndEnabledTrueOrderByReminderTimeAsc(user.getId());
        var habitIds = reminders.stream().map(reminder -> reminder.getHabit().getId()).distinct().toList();
        Map<LocalDate, Map<Long, HabitStateHistory>> stateByDate = new HashMap<>();
        for (int offset = 0; offset <= 1; offset++) {
            LocalDate date = now.toLocalDate().minusDays(offset);
            stateByDate.put(date, recordedStates(habitIds, date));
        }

        return reminders.stream()
                .filter(r -> r.getHabit().isActive())
                .filter(r -> {
                    Set<String> days = Arrays.stream(r.getDaysOfWeek().split(","))
                            .map(String::trim)
                            .collect(Collectors.toSet());
                    // Inspect both dates when the look-back window crosses midnight.
                    for (int offset = 0; offset <= 1; offset++) {
                        var date = now.toLocalDate().minusDays(offset);
                        if (!days.contains(dayOfWeekCode(date.getDayOfWeek()))) continue;
                        var recordedState = stateByDate.get(date).get(r.getHabit().getId());
                        if (recordedState != null && !recordedState.isActive()) continue;
                        String scheduledDays = recordedState == null ? r.getHabit().getScheduledDays() : recordedState.getScheduledDays();
                        if (!HabitSchedule.includes(scheduledDays, date)) continue;
                        var scheduled = date.atTime(r.getReminderTime());
                        // Skip nonexistent wall times; either occurrence during a DST overlap is valid.
                        for (var zoneOffset : now.getZone().getRules().getValidOffsets(scheduled)) {
                            var occurrence = scheduled.toInstant(zoneOffset);
                            if (!occurrence.isBefore(windowStart) && !occurrence.isAfter(now.toInstant())) return true;
                        }
                    }
                    return false;
                })
                .map(ReminderResponse::from)
                .toList();
    }

    private Map<Long, HabitStateHistory> recordedStates(List<Long> habitIds, LocalDate date) {
        if (habitIds.isEmpty()) return Map.of();
        return HabitStateTimeline.latestForHabits(stateHistory.statesOnOrBefore(habitIds, date), date);
    }

    private String fingerprint(CreateReminderRequest request) {
        try {
            byte[] bytes = json.writeValueAsBytes(new Object[]{request.habitId(), request.reminderTime().toString(), request.daysOfWeek(), request.message()});
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("Cannot fingerprint reminder request", e);
        }
    }

    private static void requireHabitSchedule(Habit habit, String reminderDays) {
        if (reminderDays == null || reminderDays.isBlank()) {
            throw new IllegalArgumentException("Chọn ít nhất một ngày nhắc.");
        }
        String scheduledDays = HabitSchedule.normalize(habit.getScheduledDays());
        if (scheduledDays == null) {
            throw new IllegalArgumentException("Thói quen chưa có lịch thực hiện hợp lệ.");
        }
        Set<String> scheduled = Arrays.stream(scheduledDays.split(",")).collect(Collectors.toSet());
        String[] requestedDays = reminderDays.split(",");
        Set<String> requested = Arrays.stream(requestedDays).map(String::trim).collect(Collectors.toSet());
        if (requested.size() != requestedDays.length) {
            throw new IllegalArgumentException("Ngày nhắc không được trùng.");
        }
        boolean includesRestDay = requested.stream()
                .anyMatch(day -> !scheduled.contains(day));
        if (includesRestDay) {
            throw new IllegalArgumentException("Lịch nhắc chỉ có thể đặt vào ngày thực hiện của thói quen.");
        }
    }

    private Reminder getReminder(AppUser user, Long id) {
        return reminderRepository.lockByIdAndUserId(id, user.getId())
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
