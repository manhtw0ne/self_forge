package com.selfforge.discipline.penalty;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/penalties")
public class PenaltyController {

    private final PenaltyService penaltyService;
    private final CurrentUserService currentUserService;

    public PenaltyController(PenaltyService penaltyService, CurrentUserService currentUserService) {
        this.penaltyService = penaltyService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<PenaltyResponse> history(HttpServletRequest servletRequest) {
        return penaltyService.getHistory(currentUserService.requireUser(servletRequest));
    }

    @GetMapping("/summary")
    public PenaltyService.PenaltySummary summary(HttpServletRequest servletRequest) {
        return penaltyService.getSummary(currentUserService.requireUser(servletRequest));
    }
}
