package com.selfforge.discipline.review;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.common.RequirePremium;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@RequirePremium
@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/api/weekly-review")
public class WeeklyReviewController {

    private final WeeklyReviewRepository reviewRepository;
    private final CurrentUserService currentUserService;

    public WeeklyReviewController(WeeklyReviewRepository reviewRepository, CurrentUserService currentUserService) {
        this.reviewRepository = reviewRepository;
        this.currentUserService = currentUserService;
    }

    public record ReviewRequest(String wins, String improvements, String nextWeekPlan, int rating) {}
    public record ReviewResponse(Long id, LocalDate weekStart, String wins, String improvements, String nextWeekPlan, int rating) {
        static ReviewResponse from(WeeklyReview r) {
            return new ReviewResponse(r.getId(), r.getWeekStart(), r.getWins(), r.getImprovements(), r.getNextWeekPlan(), r.getRating());
        }
    }

    @GetMapping("/current")
    public ReviewResponse current(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return reviewRepository.findByUserIdAndWeekStart(user.getId(), weekStart)
                .map(ReviewResponse::from)
                .orElse(null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse save(@RequestBody ReviewRequest req, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        WeeklyReview review = reviewRepository.findByUserIdAndWeekStart(user.getId(), weekStart)
                .map(existing -> {
                    existing.update(req.wins(), req.improvements(), req.nextWeekPlan(), req.rating());
                    return existing;
                })
                .orElseGet(() -> reviewRepository.save(
                        new WeeklyReview(user, weekStart, req.wins(), req.improvements(), req.nextWeekPlan(), req.rating())
                ));
        return ReviewResponse.from(review);
    }

    @GetMapping("/history")
    public List<ReviewResponse> history(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        return reviewRepository.findByUserIdOrderByWeekStartDesc(user.getId())
                .stream().map(ReviewResponse::from).toList();
    }
}
