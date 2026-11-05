package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.PremiumController;
import com.selfforge.discipline.category.Category;
import com.selfforge.discipline.category.CategoryService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.selfforge.discipline.habit.HabitRequests.CreateHabitRequest;
import static com.selfforge.discipline.habit.HabitRequests.UpdateHabitRequest;

@Service
@Transactional
public class HabitService {

    private final HabitRepository habitRepository;
    private final CategoryService categoryService;
    private final AppUserRepository users;
    private final HabitBatchReceiptRepository receipts;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    private final HabitStateHistoryService history;

    public HabitService(HabitRepository habitRepository, CategoryService categoryService, AppUserRepository users, HabitBatchReceiptRepository receipts, com.fasterxml.jackson.databind.ObjectMapper json, HabitStateHistoryService history) {
        this.history = history;
        this.receipts = receipts; this.json = json;
        this.users = users;
        this.habitRepository = habitRepository;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public List<HabitResponse> listActive() {
        return habitRepository.findByActiveTrueOrderByCreatedAtAsc().stream()
                .map(HabitResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HabitResponse> listActive(AppUser user) {
        return habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId()).stream()
                .sorted(java.util.Comparator.comparingInt(Habit::getSortOrder).thenComparing(Habit::getCreatedAt).thenComparing(Habit::getId))
                .map(HabitResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Habit getHabit(Long id) {
        return habitRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Habit " + id + " does not exist"));
    }

    @Transactional(readOnly = true)
    public Habit getHabit(AppUser user, Long id) {
        Habit habit = getHabit(id);
        if (habit.getUser() == null || !habit.getUser().getId().equals(user.getId())) {
            throw new EntityNotFoundException("Habit " + id + " does not exist");
        }
        return habit;
    }

    /**
     * New work must not be attached to a paused habit. Existing records remain
     * readable and correctable, but callers that begin new activity use this
     * owner-scoped guard before changing persistent data.
     */
    @Transactional(readOnly = true)
    public Habit getActiveHabit(AppUser user, Long id) {
        Habit habit = getHabit(user, id);
        if (!habit.isActive()) {
            throw new IllegalStateException("Thói quen đã tắt. Hãy bật lại trước khi tạo hoạt động mới.");
        }
        return habit;
    }

    @Transactional(readOnly = true)
    public List<HabitResponse> listInactive(AppUser user) {
        return habitRepository.findByUserIdAndActiveFalseOrderByCreatedAtDesc(user.getId()).stream()
                .map(HabitResponse::from).toList();
    }

    public HabitResponse create(AppUser user, CreateHabitRequest request) {
        user = users.lockById(user.getId()).orElseThrow();
        requireCapacity(user);
        int targetPerWeek = request.targetPerWeek() == null ? 7 : request.targetPerWeek();
        Category category = categoryService.getById(user, request.categoryId());
        Habit habit = new Habit(
                user,
                request.name(),
                request.description(),
                request.difficulty(),
                targetPerWeek,
                request.points(),
                category,
                request.tags(),
                HabitSchedule.normalizeOrDefault(request.scheduledDays(), targetPerWeek)
        );
        habitRepository.save(habit);
        history.created(habit);
        return HabitResponse.from(habit);
    }

    public List<HabitResponse> createBatch(AppUser user, List<CreateHabitRequest> requests, java.util.UUID requestId) {
        AppUser lockedUser = users.lockById(user.getId()).orElseThrow();
        String fingerprint;
        try {
            fingerprint = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(json.writeValueAsBytes(requests)));
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("Cannot fingerprint habit batch", e);
        }
        if (requestId != null) {
            var prior = receipts.findByUserIdAndRequestId(user.getId(), requestId.toString());
            if (prior.isPresent()) {
                if (!prior.get().getFingerprint().equals(fingerprint)) throw new IllegalStateException("Mã yêu cầu đã được dùng cho bộ thói quen khác.");
                return java.util.Arrays.stream(prior.get().getHabitIds().split(","))
                        .map(Long::valueOf).map(id -> HabitResponse.from(getHabit(lockedUser, id))).toList();
            }
        }
        var result = requests.stream().map(request -> create(lockedUser, request)).toList();
        if (requestId != null) receipts.save(new HabitBatchReceipt(user.getId(), requestId.toString(), fingerprint,
                result.stream().map(h -> h.id().toString()).collect(java.util.stream.Collectors.joining(","))));
        return result;
    }

    public List<HabitResponse> assignCategory(AppUser user,Long categoryId,List<HabitController.CategoryAssignment> items){
        users.lockById(user.getId()).orElseThrow();
        var unique=new java.util.HashSet<Long>();
        for(var item:items)if(!unique.add(item.habitId()))throw new IllegalArgumentException("Danh sách thói quen không được trùng.");
        Category category=categoryService.getById(user,categoryId);
        var selected=new java.util.ArrayList<Habit>();
        for(var item:items)selected.add(getHabit(user,item.habitId()));
        boolean applied=selected.stream().allMatch(habit->java.util.Objects.equals(habit.getCategory()==null?null:habit.getCategory().getId(),categoryId));
        if(!applied){
            for(int i=0;i<selected.size();i++){
                Long current=selected.get(i).getCategory()==null?null:selected.get(i).getCategory().getId();
                if(!java.util.Objects.equals(current,items.get(i).expected().categoryId()))throw new IllegalStateException("Danh mục của thói quen đã thay đổi. Tải lại danh sách trước khi áp dụng cả nhóm.");
            }
            for(var habit:selected)habit.setCategory(category);
        }
        return selected.stream().map(HabitResponse::from).toList();
    }

    public HabitResponse update(AppUser user, Long id, UpdateHabitRequest request) {
        user = users.lockById(user.getId()).orElseThrow();
        Habit habit = getHabit(user, id);
        if (Boolean.TRUE.equals(request.clearCategory()) && request.categoryId() != null)
            throw new IllegalArgumentException("Cannot both clear and assign a category");
        if (request.expected() != null && !matches(habit, request.expected())) {
            throw new IllegalStateException("Thói quen đã thay đổi trên máy chủ. Bản nháp của bạn được giữ lại; tải bản mới trước khi sửa tiếp.");
        }
        if (Boolean.TRUE.equals(request.active()) && !habit.isActive()) requireCapacity(user);
        int previousTarget = habit.getTargetPerWeek();
        String previousSchedule = habit.getScheduledDays();
        boolean previouslyActive = habit.isActive();
        int nextTarget = request.targetPerWeek() == null ? habit.getTargetPerWeek() : request.targetPerWeek();
        String nextSchedule = request.scheduledDays() == null
                ? (request.targetPerWeek() == null ? habit.getScheduledDays() : HabitSchedule.defaultFor(nextTarget))
                : HabitSchedule.normalizeOrDefault(request.scheduledDays(), nextTarget);
        HabitSchedule.requireMatchesTarget(nextSchedule, nextTarget);
        habit.update(
                request.name(),
                request.description(),
                request.difficulty(),
                request.targetPerWeek(),
                request.points(),
                request.active(),
                nextSchedule
        );
        if (Boolean.TRUE.equals(request.clearCategory())) habit.setCategory(null);
        if (request.categoryId() != null) {
            habit.setCategory(categoryService.getById(user, request.categoryId()));
        }
        if (request.tags() != null) {
            habit.setTags(request.tags());
        }
        history.changed(habit, previousTarget, previousSchedule, previouslyActive);
        return HabitResponse.from(habit);
    }

    private boolean matches(Habit habit, HabitRequests.HabitSnapshot expected) {
        Long categoryId = habit.getCategory() == null ? null : habit.getCategory().getId();
        return java.util.Objects.equals(habit.getName(), expected.name())
                && java.util.Objects.equals(habit.getDescription(), expected.description())
                && habit.getDifficulty() == expected.difficulty()
                && habit.getTargetPerWeek() == expected.targetPerWeek()
                && (expected.scheduledDays() == null || java.util.Objects.equals(habit.getScheduledDays(), expected.scheduledDays()))
                && habit.getPoints() == expected.points()
                && habit.isActive() == expected.active()
                && java.util.Objects.equals(categoryId, expected.categoryId())
                && java.util.Objects.equals(habit.getTags(), expected.tags());
    }

    public List<HabitResponse> reorder(AppUser user, List<HabitController.ReorderItem> items) {
        users.lockById(user.getId()).orElseThrow();
        var ids = new java.util.HashSet<Long>();
        var selected = new java.util.ArrayList<Habit>();
        for (var item : items) {
            if (!ids.add(item.id())) throw new IllegalArgumentException("Duplicate habit ID");
            Habit habit = getHabit(user, item.id());
            if (!habit.isActive()) throw new EntityNotFoundException("Active habit does not exist");
            selected.add(habit);
        }
        // Validate every ID before mutating; foreign or inactive IDs reject the entire request.
        for (int i = 0; i < items.size(); i++) {
            selected.get(i).setSortOrder(items.get(i).sortOrder());
            selected.get(i).setStackGroup(items.get(i).stackGroup());
        }
        return listActive(user);
    }

    public void deactivate(AppUser user, Long id) {
        update(user, id, new UpdateHabitRequest(null, null, null, null, null, false, null, null, null));
    }

    private void requireCapacity(AppUser user) {
        if (!user.isPremium() && habitRepository.countByUserIdAndActiveTrue(user.getId()) >= PremiumController.FREE_MAX_HABITS) {
            throw new IllegalStateException("Bạn đã đạt giới hạn " + PremiumController.FREE_MAX_HABITS
                    + " thói quen. Tắt một thói quen hoặc nâng cấp Premium để bật thêm.");
        }
    }
}
