package com.selfforge.discipline.feedback;

import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Private beta feedback. A report is only created by an authenticated user's
 * explicit submit action; it never gathers journals, check-ins, email, or tokens.
 */
@RestController
@RequestMapping("/api/feedback")
@Transactional
public class FeedbackController {
    private static final Duration WINDOW = Duration.ofHours(24);
    private static final int MAX_LISTED = 20;

    private final CurrentUserService current;
    private final AppUserRepository users;
    private final FeedbackSubmissionRepository submissions;
    private final Clock clock;
    private final int dailyLimit;
    private final ApplicationEventPublisher events;

    public FeedbackController(CurrentUserService current, AppUserRepository users,
                              FeedbackSubmissionRepository submissions, Clock clock,
                              @Value("${app.feedback.daily-limit:5}") int dailyLimit,
                              ApplicationEventPublisher events) {
        if (dailyLimit < 1 || dailyLimit > 100) throw new IllegalArgumentException("Invalid feedback daily limit");
        this.current = current;
        this.users = users;
        this.submissions = submissions;
        this.clock = clock;
        this.dailyLimit = dailyLimit;
        this.events = events;
    }

    public record SubmitRequest(
            @NotNull FeedbackType type,
            @NotBlank @Size(max = 500) String summary,
            @Size(max = 1000) String steps,
            @Size(max = 500) String expected,
            @NotNull @Pattern(regexp = "vi|en") String language) { }

    public record Response(long id, String type, String summary, String steps,
                           String expected, String language, Instant createdAt) { }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Response> list(HttpServletRequest request) {
        long userId = current.requireUser(request).getId();
        return submissions.findTop20ByUser_IdOrderByIdDesc(userId).stream().map(FeedbackController::response).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response create(@Valid @RequestBody SubmitRequest body, HttpServletRequest request) {
        long userId = current.requireUser(request).getId();
        // The user-row lock makes the per-account limit durable across app instances.
        var user = users.lockById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Instant now = clock.instant();
        if (submissions.countByUser_IdAndCreatedAtGreaterThanEqual(userId, now.minus(WINDOW)) >= dailyLimit) {
            throw new FeedbackRateLimited();
        }
        var saved = submissions.save(new FeedbackSubmission(user, body.type(), clean(body.summary()),
                cleanNullable(body.steps()), cleanNullable(body.expected()), body.language(), now));
        events.publishEvent(FeedbackSubmitted.from(saved));
        return response(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id, HttpServletRequest request) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phản hồi không hợp lệ.");
        long userId = current.requireUser(request).getId();
        if (submissions.deleteByIdAndUser_Id(id, userId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi này.");
        }
    }

    private static Response response(FeedbackSubmission row) {
        return new Response(row.getId(), row.getType().name(), row.getSummary(), row.getSteps(),
                row.getExpected(), row.getLanguage(), row.getCreatedAt());
    }

    private static String clean(String value) { return value.trim(); }
    private static String cleanNullable(String value) { return value == null ? "" : value.trim(); }

    private static final class FeedbackRateLimited extends ResponseStatusException {
        FeedbackRateLimited() {
            super(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã gửi đủ phản hồi trong 24 giờ gần đây. Hãy quay lại sau.");
        }
        @Override public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Retry-After", Long.toString(Duration.ofHours(1).toSeconds()));
            return headers;
        }
    }
}
