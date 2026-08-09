package com.selfforge.discipline.reminder;

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

import static com.selfforge.discipline.reminder.ReminderRequests.CreateReminderRequest;
import static com.selfforge.discipline.reminder.ReminderRequests.UpdateReminderRequest;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;
    private final CurrentUserService currentUserService;

    public ReminderController(ReminderService reminderService, CurrentUserService currentUserService) {
        this.reminderService = reminderService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ReminderResponse> list(HttpServletRequest servletRequest) {
        return reminderService.list(currentUserService.requireUser(servletRequest));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderResponse create(@Valid @RequestBody CreateReminderRequest request, HttpServletRequest servletRequest) {
        return reminderService.create(currentUserService.requireUser(servletRequest), request);
    }

    @PatchMapping("/{id}")
    public ReminderResponse update(@PathVariable Long id, @Valid @RequestBody UpdateReminderRequest request, HttpServletRequest servletRequest) {
        return reminderService.update(currentUserService.requireUser(servletRequest), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        reminderService.delete(currentUserService.requireUser(servletRequest), id);
    }

    @GetMapping("/due")
    public List<ReminderResponse> due(HttpServletRequest servletRequest) {
        return reminderService.getDueReminders(currentUserService.requireUser(servletRequest));
    }
}
