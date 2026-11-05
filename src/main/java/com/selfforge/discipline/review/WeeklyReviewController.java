package com.selfforge.discipline.review;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
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

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private final UserTime userTime;
    private final com.selfforge.discipline.auth.AppUserRepository users;

    private final WeeklyReviewRepository reviewRepository;
    private final CurrentUserService currentUserService;

    public WeeklyReviewController(WeeklyReviewRepository reviewRepository, CurrentUserService currentUserService, UserTime userTime, com.selfforge.discipline.auth.AppUserRepository users) {
        this.userTime = userTime;
        this.users = users;
        this.reviewRepository = reviewRepository;
        this.currentUserService = currentUserService;
    }

    public record ReviewRequest(
            @jakarta.validation.constraints.Size(max = 2000) String wins,
            @jakarta.validation.constraints.Size(max = 2000) String improvements,
            @jakarta.validation.constraints.Size(max = 2000) String nextWeekPlan,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int rating, LocalDate weekStart, @jakarta.validation.Valid ReviewSnapshot expected) {}
    public record ReviewSnapshot(Long id,
            @jakarta.validation.constraints.Size(max = 2000) String wins,
            @jakarta.validation.constraints.Size(max = 2000) String improvements,
            @jakarta.validation.constraints.Size(max = 2000) String nextWeekPlan,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) Integer rating) {}
    private static String text(String value) { return value == null ? "" : value; }
    public record ReviewResponse(Long id, LocalDate weekStart, String wins, String improvements, String nextWeekPlan, int rating) {
        static ReviewResponse from(WeeklyReview r) {
            return new ReviewResponse(r.getId(), r.getWeekStart(), r.getWins(), r.getImprovements(), r.getNextWeekPlan(), r.getRating());
        }
    }

    @GetMapping("/current")
    public ReviewResponse current(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        LocalDate weekStart = userTime.today(user).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return reviewRepository.findByUserIdAndWeekStart(user.getId(), weekStart)
                .map(ReviewResponse::from)
                .orElse(null);
    }

    public record ReviewContext(LocalDate weekStart, ReviewResponse review) {}

    @GetMapping("/context")
    public ReviewContext context(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        LocalDate week = userTime.today(user).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new ReviewContext(week, reviewRepository.findByUserIdAndWeekStart(user.getId(), week)
                .map(ReviewResponse::from).orElse(null));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse save(@jakarta.validation.Valid @RequestBody ReviewRequest req, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        entityManager.refresh(user);
        currentUserService.requireUser(request);
        if (!user.isPremium()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Tính năng này cần Premium đang hoạt động.");
        }
        LocalDate weekStart = userTime.today(user).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        if (req.weekStart() != null && !req.weekStart().equals(weekStart)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,
                    "Tuần đã thay đổi. Hãy giữ lại nội dung và tải lại trang trước khi lưu.");
        }
        var previous = reviewRepository.findByUserIdAndWeekStart(user.getId(), weekStart);
        if (req.expected() != null) {
            var expected = req.expected(); var current = previous.orElse(null);
            boolean matches = current == null ? expected.id() == null :
                    java.util.Objects.equals(expected.id(), current.getId()) &&
                    text(expected.wins()).equals(text(current.getWins())) && text(expected.improvements()).equals(text(current.getImprovements())) &&
                    text(expected.nextWeekPlan()).equals(text(current.getNextWeekPlan())) && java.util.Objects.equals(expected.rating(), current.getRating());
            if (!matches) throw new IllegalStateException("Nội dung trên máy chủ đã thay đổi. Bản nháp được giữ; tải bản mới trước khi lưu tiếp.");
        }
        WeeklyReview review = previous
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
