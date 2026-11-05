package com.selfforge.discipline.beta;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:beta-metrics-http;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.beta-metrics.key=operator-test-key"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class BetaMetricsHttpTests {
    @Autowired MockMvc mvc;

    @Test void aggregate_report_requires_the_configured_header_and_never_returns_user_fields() throws Exception {
        mvc.perform(get("/api/operator/beta-metrics").param("from", "2026-10-01").param("through", "2026-10-07"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/operator/beta-metrics")
                        .header("X-SelfForge-Operator-Key", "operator-test-key")
                        .param("from", "2026-10-01").param("through", "2026-10-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrations").value(0))
                .andExpect(jsonPath("$.activatedUsers").value(0))
                .andExpect(jsonPath("$.usersActivatedWithinDay1").value(0))
                .andExpect(jsonPath("$.weeklyAiSuggestions").value(0))
                .andExpect(jsonPath("$.weeklyAiRatings").value(0))
                .andExpect(jsonPath("$.weeklyAiWillTry").value(0))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.users").doesNotExist());
    }
}
