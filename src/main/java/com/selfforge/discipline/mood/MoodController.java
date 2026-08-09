package com.selfforge.discipline.mood;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.selfforge.discipline.mood.MoodRequests.SaveMoodRequest;

@RestController
@RequestMapping("/api/mood")
public class MoodController {

    private final MoodService moodService;
    private final CurrentUserService currentUserService;

    public MoodController(MoodService moodService, CurrentUserService currentUserService) {
        this.moodService = moodService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public MoodResponse save(@Valid @RequestBody SaveMoodRequest request, HttpServletRequest servletRequest) {
        return moodService.saveOrUpdate(currentUserService.requireUser(servletRequest), request);
    }

    @GetMapping
    public MoodResponse today(HttpServletRequest servletRequest) {
        return moodService.getToday(currentUserService.requireUser(servletRequest));
    }

    @GetMapping("/history")
    public List<MoodResponse> history(
            @RequestParam(defaultValue = "30") int days,
            HttpServletRequest servletRequest
    ) {
        return moodService.getHistory(currentUserService.requireUser(servletRequest), days);
    }
}
