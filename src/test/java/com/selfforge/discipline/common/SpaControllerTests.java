package com.selfforge.discipline.common;

import com.selfforge.discipline.auth.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SpaController.class)
class SpaControllerTests {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @Test
    void everyDeclaredReactRouteForwardsToTheApplicationShell() throws Exception {
        for (String route : List.of(
                "/", "/login", "/privacy", "/terms", "/email-change-recovery",
                "/habits", "/journal", "/check-in-history", "/stats", "/challenges",
                "/rewards", "/pomodoro", "/review", "/goals", "/reminders",
                "/companion", "/coach", "/help", "/profile", "/premium")) {
            mvc.perform(get(route))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }
    }
}
