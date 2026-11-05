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
    private final RewardCreateReceiptRepository receipts;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    private final CurrentUserService currentUserService;

    public CustomRewardController(CustomRewardRepository rewardRepository, RewardService rewardService,
                                  CurrentUserService currentUserService, com.selfforge.discipline.auth.AppUserRepository users, RewardCreateReceiptRepository receipts, com.fasterxml.jackson.databind.ObjectMapper json) {
        this.receipts=receipts; this.json=json;
        this.users = users;
        this.rewardRepository = rewardRepository;
        this.rewardService = rewardService;
        this.currentUserService = currentUserService;
    }

    public record CreateRewardRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 255) String name, @jakarta.validation.constraints.Size(max = 255) String description, @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(1000000) int xpCost, java.util.UUID requestId) {}
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
        users.lockById(user.getId()).orElseThrow();
        String name=req.name().trim(), description=req.description()==null?"":req.description().trim();
        String fingerprint;
        try {
            fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(new Object[]{name,description,req.xpCost()})));
        } catch(java.io.IOException | java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Cannot fingerprint reward request",e); }
        if(req.requestId()!=null){
            var prior=receipts.findByUserIdAndRequestId(user.getId(),req.requestId().toString());
            if(prior.isPresent()){
                if(!prior.get().getFingerprint().equals(fingerprint))throw new IllegalStateException("Mã yêu cầu đã được dùng cho phần thưởng khác.");
                return RewardResponse.from(rewardRepository.findByIdAndUserId(prior.get().getRewardId(),user.getId()).orElseThrow(()->new IllegalStateException("Phần thưởng của yêu cầu này đã bị xóa.")));
            }
        }
        CustomReward reward = rewardRepository.save(new CustomReward(user, name, description, req.xpCost()));
        if(req.requestId()!=null)receipts.save(new RewardCreateReceipt(user.getId(),req.requestId().toString(),fingerprint,reward.getId()));
        return RewardResponse.from(reward);
    }

    public record EditRewardRequest(@jakarta.validation.constraints.NotNull @jakarta.validation.Valid CreateRewardRequest expected, @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=255) String name, @jakarta.validation.constraints.Size(max=255) String description, @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(1000000) int xpCost) {}
    @GetMapping("/{id}")
    public RewardResponse get(@PathVariable Long id,HttpServletRequest request){var user=currentUserService.requireUser(request);return RewardResponse.from(rewardRepository.findByIdAndUserId(id,user.getId()).orElseThrow(()->new EntityNotFoundException("Reward not found")));}
    private boolean matches(CustomReward reward,String name,String description,int xpCost){return java.util.Objects.equals(reward.getName(),name)&&java.util.Objects.equals(reward.getDescription()==null?"":reward.getDescription(),description==null?"":description)&&reward.getXpCost()==xpCost;}
    @PatchMapping("/{id}")
    public RewardResponse edit(@PathVariable Long id,@jakarta.validation.Valid @RequestBody EditRewardRequest body,HttpServletRequest request){
        var user=currentUserService.requireUser(request);users.lockById(user.getId()).orElseThrow();var reward=rewardRepository.findByIdAndUserId(id,user.getId()).orElseThrow(()->new EntityNotFoundException("Reward not found"));
        if(reward.isClaimed())throw new IllegalStateException("Không thể sửa phần thưởng đã nhận.");
        String name=body.name().trim(),description=body.description()==null?"":body.description().trim();
        if(matches(reward,name,description,body.xpCost()))return RewardResponse.from(reward);
        if(!matches(reward,body.expected().name(),body.expected().description(),body.expected().xpCost()))throw new IllegalStateException("Phần thưởng đã thay đổi. Xem bản mới trước khi lưu.");
        reward.update(name,description,body.xpCost());return RewardResponse.from(reward);
    }
    public record ClaimRequest(@jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(1000000) Integer expectedXpCost, @jakarta.validation.Valid CreateRewardRequest expected) {}

    @PostMapping("/{id}/claim")
    public RewardResponse claim(@PathVariable Long id, @jakarta.validation.Valid @RequestBody(required=false) ClaimRequest body, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        users.lockById(user.getId()).orElseThrow();
        CustomReward reward = rewardRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Reward not found"));
        if (reward.isClaimed()) {
            return RewardResponse.from(reward);
        }
        if(body!=null&&body.expectedXpCost()!=null&&body.expectedXpCost()!=reward.getXpCost())throw new IllegalStateException("Giá XP đã thay đổi. Xem lại phần thưởng trước khi nhận.");
        if(body!=null&&body.expected()!=null&&!matches(reward,body.expected().name(),body.expected().description(),body.expected().xpCost()))throw new IllegalStateException("Nội dung phần thưởng đã thay đổi. Xem lại trước khi nhận.");
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
