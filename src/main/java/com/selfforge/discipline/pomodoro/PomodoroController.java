package com.selfforge.discipline.pomodoro;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pomodoro")
public class PomodoroController {

    private final PomodoroService pomodoroService;
    private final CurrentUserService currentUserService;

    public PomodoroController(PomodoroService pomodoroService, CurrentUserService currentUserService) {
        this.pomodoroService = pomodoroService;
        this.currentUserService = currentUserService;
    }

    public record StartRequest(Long habitId, Integer durationMinutes) {}
    public record CompleteRequest(String note) {}

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public PomodoroResponse start(@RequestBody StartRequest request, HttpServletRequest servletRequest) {
        return pomodoroService.startSession(
                currentUserService.requireUser(servletRequest), request.habitId(), request.durationMinutes());
    }

    @PostMapping("/{id}/complete")
    public PomodoroResponse complete(
            @PathVariable Long id,
            @RequestBody(required = false) CompleteRequest request,
            HttpServletRequest servletRequest
    ) {
        return pomodoroService.completeSession(
                currentUserService.requireUser(servletRequest), id,
                request != null ? request.note() : null);
    }

    @GetMapping("/recent")
    public List<PomodoroResponse> recent(HttpServletRequest servletRequest) {
        return pomodoroService.listRecent(currentUserService.requireUser(servletRequest));
    }

    @GetMapping("/today")
    public Map<String, Object> today(HttpServletRequest servletRequest) {
        return pomodoroService.todayStats(currentUserService.requireUser(servletRequest));
    }
}
