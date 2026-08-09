package com.selfforge.discipline.checkin;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

import static com.selfforge.discipline.checkin.CheckInRequests.UpsertCheckInRequest;

@RestController
@RequestMapping("/api/check-ins")
public class CheckInController {

    private final CheckInService checkInService;
    private final CurrentUserService currentUserService;

    public CheckInController(CheckInService checkInService, CurrentUserService currentUserService) {
        this.checkInService = checkInService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<CheckInResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest servletRequest
    ) {
        return checkInService.listByDate(currentUserService.requireUser(servletRequest), date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckInResponse upsert(@Valid @RequestBody UpsertCheckInRequest request, HttpServletRequest servletRequest) {
        return checkInService.upsert(currentUserService.requireUser(servletRequest), request);
    }
}
