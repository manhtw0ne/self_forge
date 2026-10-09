package com.selfforge.discipline.streak;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/streak-freeze")
public class StreakFreezeController {

    private final StreakFreezeService freezeService;
    private final CurrentUserService currentUserService;

    public StreakFreezeController(StreakFreezeService freezeService, CurrentUserService currentUserService) {
        this.freezeService = freezeService;
        this.currentUserService = currentUserService;
    }

    public record UseFreezeRequest(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long habitId, LocalDate date) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StreakFreezeResponse useFreeze(@jakarta.validation.Valid @RequestBody UseFreezeRequest request, HttpServletRequest servletRequest) {
        return freezeService.useFreeze(currentUserService.requireUser(servletRequest), request.habitId(), request.date());
    }

    @GetMapping("/remaining")
    public Map<String, Integer> remaining(HttpServletRequest servletRequest) {
        var user = currentUserService.requireUser(servletRequest);
        int remaining = freezeService.remainingFreezes(user);
        return Map.of("remaining", remaining, "max", freezeService.maxFreezes(user));
    }

    @GetMapping("/history")
    public List<StreakFreezeResponse> history(HttpServletRequest servletRequest) {
        return freezeService.history(currentUserService.requireUser(servletRequest));
    }
}
