package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rewards")
public class RewardController {

    private final RewardService rewardService;
    private final CurrentUserService currentUserService;

    public RewardController(RewardService rewardService, CurrentUserService currentUserService) {
        this.rewardService = rewardService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/progress")
    public RewardResponse.UserProgressResponse progress(HttpServletRequest servletRequest) {
        return rewardService.getUserProgress(currentUserService.requireUser(servletRequest));
    }

    @GetMapping("/achievements")
    public List<RewardResponse.AchievementListItem> achievements(HttpServletRequest servletRequest) {
        return rewardService.getAllAchievements(currentUserService.requireUser(servletRequest));
    }
}
