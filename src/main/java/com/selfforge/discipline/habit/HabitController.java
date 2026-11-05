package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;

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
    private final CurrentUserService currentUserService;

    public HabitController(HabitService habitService, CurrentUserService currentUserService) {
        this.habitService = habitService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<HabitResponse> list(HttpServletRequest servletRequest) {
        return habitService.listActive(currentUserService.requireUser(servletRequest));
    }

    @GetMapping("/inactive")
    public List<HabitResponse> inactive(HttpServletRequest request) {
        return habitService.listInactive(currentUserService.requireUser(request));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitResponse create(@Valid @RequestBody CreateHabitRequest request, HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser(servletRequest);
        return habitService.create(user, request);
    }

    public record BatchCreateRequest(
            @jakarta.validation.constraints.NotEmpty
            @jakarta.validation.constraints.Size(max = 10)
            List<@jakarta.validation.constraints.NotNull @Valid CreateHabitRequest> habits,
            java.util.UUID requestId) {}

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<HabitResponse> createBatch(@Valid @RequestBody BatchCreateRequest request,
                                           HttpServletRequest servletRequest) {
        return habitService.createBatch(currentUserService.requireUser(servletRequest), request.habits(), request.requestId());
    }

    public record CategorySnapshot(@jakarta.validation.constraints.Positive Long categoryId){}
    public record CategoryAssignment(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long habitId,
        @jakarta.validation.constraints.NotNull @Valid CategorySnapshot expected){}
    public record AssignCategoryRequest(@jakarta.validation.constraints.Positive Long categoryId,
        @jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max=50) List<@jakarta.validation.constraints.NotNull @Valid CategoryAssignment> items){}
    @PatchMapping("/categories")
    public List<HabitResponse> assignCategory(@Valid @RequestBody AssignCategoryRequest body,HttpServletRequest request){
        return habitService.assignCategory(currentUserService.requireUser(request),body.categoryId(),body.items());
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

    public record ReorderRequest(
            @jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max = 500)
            List<@jakarta.validation.constraints.NotNull @Valid ReorderItem> items) {}
    public record ReorderItem(
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long id,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(0)
            @jakarta.validation.constraints.Max(1000000) Integer sortOrder,
            @jakarta.validation.constraints.Size(max = 255) String stackGroup) {}

    @RequirePremium
    @PatchMapping("/reorder")
    public List<HabitResponse> reorder(@Valid @RequestBody ReorderRequest request, HttpServletRequest servletRequest) {
        return habitService.reorder(currentUserService.requireUser(servletRequest), request.items());
    }
}
