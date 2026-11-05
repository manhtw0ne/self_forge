package com.selfforge.discipline.common;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {
    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /**
     * Answers whether this JVM can respond at all. Keep this independent of the
     * database so an orchestration platform does not restart a healthy process
     * merely because a dependency has a short outage.
     */
    @GetMapping("/api/health/live")
    public Map<String, String> live() {
        return Map.of("status", "UP");
    }

    /**
     * Answers whether this instance can safely receive user traffic. The legacy
     * /api/health route remains an alias so existing hosting checks keep working.
     */
    @GetMapping({"/api/health", "/api/health/ready"})
    public ResponseEntity<Map<String, String>> ready() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "UP"));
        } catch (org.springframework.dao.DataAccessException e) {
            return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
        }
    }
}
