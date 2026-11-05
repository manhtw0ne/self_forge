package com.selfforge.discipline.common;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API, non-static requests to index.html so that
 * React Router can handle client-side routing.
 */
@Controller
public class SpaController {

    @GetMapping(value = {
            "/",
            "/login",
            "/privacy",
            "/terms",
            "/email-change-recovery",
            "/habits",
            "/journal",
            "/check-in-history",
            "/stats",
            "/challenges",
            "/rewards",
            "/pomodoro",
            "/review",
            "/goals",
            "/reminders",
            "/companion",
            "/coach",
            "/help",
            "/profile",
            "/premium"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
