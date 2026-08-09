package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.selfforge.discipline.habit.HabitRequests.CreateHabitRequest;
import static com.selfforge.discipline.habit.HabitRequests.UpdateHabitRequest;

@RestController
@RequestMapping("/api/habits")
public class HabitController {

    private final HabitService habitService;
    private final CurrentUserService currentUserService;

    public HabitController(HabitService habitService, CurrentUserService currentUserService) {
        this.habitService = habitService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<HabitResponse> list(HttpServletRequest servletRequest) {
        return habitService.listActive(currentUserService.requireUser(servletRequest));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitResponse create(@Valid @RequestBody CreateHabitRequest request, HttpServletRequest servletRequest) {
        return habitService.create(currentUserService.requireUser(servletRequest), request);
    }

    @PatchMapping("/{id}")
    public HabitResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateHabitRequest request,
            HttpServletRequest servletRequest
    ) {
        return habitService.update(currentUserService.requireUser(servletRequest), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        habitService.deactivate(currentUserService.requireUser(servletRequest), id);
    }
}
