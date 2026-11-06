package com.selfforge.discipline.common;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {
    private final JdbcTemplate jdbc;
    private final ReleaseInfo release;

    public HealthController(JdbcTemplate jdbc, ReleaseInfo release) {
        this.jdbc = jdbc;
        this.release = release;
    }

    /**
     * Answers whether this JVM can respond at all. Keep this independent of the
     * database so an orchestration platform does not restart a healthy process
     * merely because a dependency has a short outage.
     */
    @GetMapping("/api/health/live")
    public Map<String, String> live() {
        return health("UP");
    }

    /**
     * Answers whether this instance can safely receive user traffic. The legacy
     * /api/health route remains an alias so existing hosting checks keep working.
     */
    @GetMapping({"/api/health", "/api/health/ready"})
    public ResponseEntity<Map<String, String>> ready() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(health("UP"));
        } catch (org.springframework.dao.DataAccessException e) {
            return ResponseEntity.status(503).body(health("DOWN"));
        }
    }

    private Map<String, String> health(String status) {
        return Map.of("status", status, "release", release.release());
    }
}
