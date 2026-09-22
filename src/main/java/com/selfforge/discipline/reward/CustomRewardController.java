package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.common.RequirePremium;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequirePremium
@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/api/custom-rewards")
public class CustomRewardController {

    private final com.selfforge.discipline.auth.AppUserRepository users;

    private final CustomRewardRepository rewardRepository;
    private final RewardService rewardService;
    private final CurrentUserService currentUserService;

    public CustomRewardController(CustomRewardRepository rewardRepository, RewardService rewardService,
                                  CurrentUserService currentUserService, com.selfforge.discipline.auth.AppUserRepository users) {
        this.users = users;
        this.rewardRepository = rewardRepository;
        this.rewardService = rewardService;
        this.currentUserService = currentUserService;
    }

    public record CreateRewardRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 255) String name, @jakarta.validation.constraints.Size(max = 255) String description, @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(1000000) int xpCost) {}
    public record RewardResponse(Long id, @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 255) String name, @jakarta.validation.constraints.Size(max = 255) String description, @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(1000000) int xpCost, boolean claimed, String claimedAt) {
        static RewardResponse from(CustomReward r) {
            return new RewardResponse(r.getId(), r.getName(), r.getDescription(), r.getXpCost(), r.isClaimed(),
                    r.getClaimedAt() != null ? r.getClaimedAt().toString() : null);
        }
    }

    @GetMapping
    public List<RewardResponse> list(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        return rewardRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(RewardResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RewardResponse create(@jakarta.validation.Valid @RequestBody CreateRewardRequest req, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        CustomReward reward = rewardRepository.save(new CustomReward(user, req.name(), req.description(), req.xpCost()));
        return RewardResponse.from(reward);
    }

    @PostMapping("/{id}/claim")
    public RewardResponse claim(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        users.lockById(user.getId()).orElseThrow();
        CustomReward reward = rewardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reward not found"));
        if (reward.isClaimed()) {
            throw new IllegalStateException("Phần thưởng đã được nhận rồi");
        }
        // Check XP balance
        var level = rewardService.getUserProgress(user);
        if (level.totalXp() < reward.getXpCost()) {
            throw new IllegalStateException("Không đủ XP (cần " + reward.getXpCost() + ", có " + level.totalXp() + ")");
        }
        reward.claim();
        rewardService.deductXp(user, reward.getXpCost());
        return RewardResponse.from(reward);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        users.lockById(user.getId()).orElseThrow();
        CustomReward reward = rewardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reward not found"));
        rewardRepository.delete(reward);
    }
}
