package com.selfforge.discipline.stats;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;
    private final CurrentUserService currentUserService;

    public StatsController(StatsService statsService, CurrentUserService currentUserService) {
        this.statsService = statsService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/weekly")
    public StatsResponse.WeeklyStatsResponse weekly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest servletRequest
    ) {
        return statsService.weeklyStats(currentUserService.requireUser(servletRequest), date);
    }

    @GetMapping("/monthly")
    public StatsResponse.MonthlyStatsResponse monthly(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            HttpServletRequest servletRequest
    ) {
        return statsService.monthlyStats(currentUserService.requireUser(servletRequest), month);
    }

    @GetMapping("/heatmap")
    public StatsResponse.HeatmapDayResponse heatmap(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy") Year year,
            HttpServletRequest servletRequest
    ) {
        return statsService.heatmap(currentUserService.requireUser(servletRequest), year);
    }
}
