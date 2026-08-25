package com.selfforge.discipline.export;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.DailyCheckIn;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.journal.JournalEntry;
import com.selfforge.discipline.journal.JournalRepository;
import com.selfforge.discipline.common.RequirePremium;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.List;

@RequirePremium
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final CurrentUserService currentUserService;
    private final HabitRepository habitRepository;
    private final DailyCheckInRepository checkInRepository;
    private final JournalRepository journalRepository;

    public ExportController(CurrentUserService currentUserService, HabitRepository habitRepository,
                            DailyCheckInRepository checkInRepository, JournalRepository journalRepository) {
        this.currentUserService = currentUserService;
        this.habitRepository = habitRepository;
        this.checkInRepository = checkInRepository;
        this.journalRepository = journalRepository;
    }

    @GetMapping("/csv")
    public void exportCsv(HttpServletRequest request, HttpServletResponse response) throws Exception {
        AppUser user = currentUserService.requireUser(request);

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"selfforge_export.csv\"");

        PrintWriter writer = response.getWriter();
        writer.write('\ufeff'); // BOM for Excel UTF-8

        // Section 1: Habits
        writer.println("=== THÓI QUEN ===");
        writer.println("ID,Tên,Mô tả,Độ khó,Mục tiêu/tuần,Điểm,Tags,Trạng thái");
        List<Habit> habits = habitRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Habit h : habits) {
            writer.printf("%d,\"%s\",\"%s\",%s,%d,%d,\"%s\",%s%n",
                    h.getId(), esc(h.getName()), esc(h.getDescription()),
                    h.getDifficulty(), h.getTargetPerWeek(), h.getPoints(),
                    esc(h.getTags()), h.isActive() ? "Hoạt động" : "Đã tắt");
        }

        writer.println();

        // Section 2: Check-ins (last 90 days)
        writer.println("=== CHECK-IN (90 NGÀY) ===");
        writer.println("Ngày,Thói quen,Trạng thái,Ghi chú");
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(90);
        List<DailyCheckIn> checkIns = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
        for (DailyCheckIn c : checkIns) {
            writer.printf("%s,\"%s\",%s,\"%s\"%n",
                    c.getDate(), esc(c.getHabit().getName()), c.getStatus(), esc(c.getNote()));
        }

        writer.println();

        // Section 3: Journal
        writer.println("=== NHẬT KÝ ===");
        writer.println("Ngày,Chiến thắng,Trở ngại,Bài học,Mục tiêu ngày mai");
        List<JournalEntry> journals = journalRepository.findByUserIdOrderByDateDesc(user.getId());
        for (JournalEntry j : journals) {
            writer.printf("%s,\"%s\",\"%s\",\"%s\",\"%s\"%n",
                    j.getDate(), esc(j.getWin()), esc(j.getObstacle()),
                    esc(j.getLesson()), esc(j.getTomorrowFocus()));
        }

        writer.flush();
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("\"", "\"\"").replace("\n", " ").replace("\r", "");
    }
}
