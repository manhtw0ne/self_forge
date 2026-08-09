package com.selfforge.discipline.challenge;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.selfforge.discipline.challenge.ChallengeRequests.CreateChallengeRequest;
import static com.selfforge.discipline.challenge.ChallengeRequests.UpdateChallengeStatusRequest;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeService challengeService;
    private final CurrentUserService currentUserService;

    public ChallengeController(ChallengeService challengeService, CurrentUserService currentUserService) {
        this.challengeService = challengeService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ChallengeResponse> list(HttpServletRequest servletRequest) {
        return challengeService.list(currentUserService.requireUser(servletRequest));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChallengeResponse create(
            @Valid @RequestBody CreateChallengeRequest request,
            HttpServletRequest servletRequest
    ) {
        return challengeService.create(currentUserService.requireUser(servletRequest), request);
    }

    @GetMapping("/{id}/progress")
    public ChallengeProgressResponse progress(@PathVariable Long id, HttpServletRequest servletRequest) {
        return challengeService.progress(currentUserService.requireUser(servletRequest), id);
    }

    @PatchMapping("/{id}/status")
    public ChallengeResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateChallengeStatusRequest request,
            HttpServletRequest servletRequest
    ) {
        return challengeService.updateStatus(currentUserService.requireUser(servletRequest), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        challengeService.delete(currentUserService.requireUser(servletRequest), id);
    }
}
