package com.selfforge.discipline.beta;

import com.selfforge.discipline.auth.BetaInviteService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Operator-only lifecycle for server-managed closed-beta invitations. */
@RestController
@RequestMapping("/api/operator/beta-invites")
public class BetaInviteOperatorController {
    private final BetaMetricsAccess access;
    private final BetaInviteService invites;

    public BetaInviteOperatorController(BetaMetricsAccess access, BetaInviteService invites) {
        this.access = access;
        this.invites = invites;
    }

    public record CreateRequest(@Size(max = 100) String label,
                                @Min(1) @Max(1000) Integer maxUses,
                                @Future Instant expiresAt) { }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BetaInviteService.IssuedInvite create(
            @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key,
            @Valid @RequestBody CreateRequest body) {
        requireAccess(key);
        return invites.create(body.label(), body.maxUses() == null ? 1 : body.maxUses(), body.expiresAt());
    }

    @GetMapping
    public List<BetaInviteService.InviteSummary> list(
            @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key) {
        requireAccess(key);
        return invites.list();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable long id,
            @RequestHeader(name = "X-SelfForge-Operator-Key", required = false) String key) {
        requireAccess(key);
        invites.revoke(id);
    }

    private void requireAccess(String key) {
        if (!access.granted(key)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
