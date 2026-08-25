package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.auth.PremiumController;
import com.selfforge.discipline.common.RequirePremium;
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
    private final HabitRepository habitRepository;
    private final CurrentUserService currentUserService;

    public HabitController(HabitService habitService, HabitRepository habitRepository, CurrentUserService currentUserService) {
        this.habitService = habitService;
        this.habitRepository = habitRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<HabitResponse> list(HttpServletRequest servletRequest) {
        return habitService.listActive(currentUserService.requireUser(servletRequest));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitResponse create(@Valid @RequestBody CreateHabitRequest request, HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser(servletRequest);
        // Enforce habit limit for free users
        if (!user.isPremium()) {
            int activeCount = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId()).size();
            if (activeCount >= PremiumController.FREE_MAX_HABITS) {
                throw new IllegalStateException(
                        "Bạn đã đạt giới hạn " + PremiumController.FREE_MAX_HABITS
                                + " thói quen. Nâng cấp Premium để tạo không giới hạn!");
            }
        }
        return habitService.create(user, request);
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

    public record ReorderRequest(List<ReorderItem> items) {}
    public record ReorderItem(Long id, int sortOrder, String stackGroup) {}

    @RequirePremium
    @PatchMapping("/reorder")
    public List<HabitResponse> reorder(@RequestBody ReorderRequest request, HttpServletRequest servletRequest) {
        var user = currentUserService.requireUser(servletRequest);
        List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        for (var item : request.items()) {
            habits.stream()
                    .filter(h -> h.getId().equals(item.id()))
                    .findFirst()
                    .ifPresent(h -> {
                        h.setSortOrder(item.sortOrder());
                        h.setStackGroup(item.stackGroup());
                    });
        }
        return habitService.listActive(user);
    }
}
