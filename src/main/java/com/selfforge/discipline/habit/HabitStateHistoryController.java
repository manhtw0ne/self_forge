package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/habits/{id}/state-history")
public class HabitStateHistoryController {
    private final CurrentUserService current;
    private final HabitService habits;
    private final HabitStateHistoryService history;

    public HabitStateHistoryController(CurrentUserService current, HabitService habits, HabitStateHistoryService history) {
        this.current = current;
        this.habits = habits;
        this.history = history;
    }

    @GetMapping
    public HabitStateHistoryService.Page history(@PathVariable Long id,
            @RequestParam(required = false) Long beforeId, HttpServletRequest request) {
        var user = current.requireUser(request);
        habits.getHabit(user, id);
        return history.history(user, id, beforeId);
    }
}
