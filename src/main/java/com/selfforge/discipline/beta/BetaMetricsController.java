package com.selfforge.discipline.beta;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Internal aggregate reporting endpoint; it is not exposed in the product UI. */
@RestController
@RequestMapping("/api/operator/beta-metrics")
public class BetaMetricsController {
    private final BetaMetricsAccess access;
    private final BetaMetricsService metrics;

    public BetaMetricsController(BetaMetricsAccess access, BetaMetricsService metrics) {
        this.access = access;
        this.metrics = metrics;
    }

    @GetMapping
    public BetaMetricsService.Response report(
            @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate through) {
        if (!access.granted(key)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return metrics.report(from, through);
    }
}
