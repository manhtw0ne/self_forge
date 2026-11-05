package com.selfforge.discipline.beta;

import com.selfforge.discipline.feedback.FeedbackReviewStatus;
import com.selfforge.discipline.feedback.FeedbackSubmission;
import com.selfforge.discipline.feedback.FeedbackSubmissionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Private beta-feedback triage. It intentionally exposes no account identity:
 * operators see only information a user chose to submit, plus internal review state.
 */
@RestController
@RequestMapping("/api/operator/beta-feedback")
@Transactional
public class BetaFeedbackOperatorController {
    private static final int DEFAULT_LIMIT = 20;

    private final BetaMetricsAccess access;
    private final FeedbackSubmissionRepository submissions;
    private final Clock clock;

    public BetaFeedbackOperatorController(BetaMetricsAccess access,
                                          FeedbackSubmissionRepository submissions,
                                          Clock clock) {
        this.access = access;
        this.submissions = submissions;
        this.clock = clock;
    }

    public record Response(long id, String type, String summary, String steps, String expected,
                           String language, Instant createdAt, FeedbackReviewStatus status,
                           String note, Instant reviewedAt) {
        private static Response from(FeedbackSubmission row) {
            return new Response(row.getId(), row.getType().name(), row.getSummary(), row.getSteps(),
                    row.getExpected(), row.getLanguage(), row.getCreatedAt(), row.getOperatorStatus(),
                    row.getOperatorNote(), row.getOperatorUpdatedAt());
        }
    }

    public record ReviewRequest(@NotNull FeedbackReviewStatus status,
                                @Size(max = 500) String note) { }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Response> list(
            @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key,
            @RequestParam(required = false) FeedbackReviewStatus status,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "20") int limit) {
        requireAccess(key);
        if (beforeId != null && beforeId < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return submissions.findOperatorPage(status, beforeId, PageRequest.of(0, limit)).stream()
                .map(Response::from).toList();
    }

    @PatchMapping("/{id}")
    public Response review(@PathVariable long id,
                           @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key,
                           @Valid @RequestBody ReviewRequest body) {
        requireAccess(key);
        if (id < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        FeedbackSubmission submission = submissions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String note = body.note() == null ? "" : body.note().trim();
        submission.review(body.status(), note, clock.instant());
        return Response.from(submission);
    }

    private void requireAccess(String key) {
        if (!access.granted(key)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
