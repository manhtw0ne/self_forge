package com.selfforge.discipline.pomodoro;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
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

    public record StartRequest(Long habitId, @Min(25) @Max(120) Integer durationMinutes, java.util.UUID requestId) {}
    public record CompleteRequest(@Size(max = 255) String note) {}

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public PomodoroResponse start(@Valid @RequestBody StartRequest request, HttpServletRequest servletRequest) {
        return pomodoroService.startSession(
                currentUserService.requireUser(servletRequest), request.habitId(), request.durationMinutes(), request.requestId());
    }

    @PostMapping("/{id}/complete")
    public PomodoroResponse complete(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) CompleteRequest request,
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
