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

    public HabitService(HabitRepository habitRepository, CategoryService categoryService, AppUserRepository users, HabitBatchReceiptRepository receipts, com.fasterxml.jackson.databind.ObjectMapper json) {
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
                request.tags()
        );
        return HabitResponse.from(habitRepository.save(habit));
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

    public HabitResponse update(AppUser user, Long id, UpdateHabitRequest request) {
        user = users.lockById(user.getId()).orElseThrow();
        Habit habit = getHabit(user, id);
        if (Boolean.TRUE.equals(request.clearCategory()) && request.categoryId() != null)
            throw new IllegalArgumentException("Cannot both clear and assign a category");
        if (Boolean.TRUE.equals(request.active()) && !habit.isActive()) requireCapacity(user);
        habit.update(
                request.name(),
                request.description(),
                request.difficulty(),
                request.targetPerWeek(),
                request.points(),
                request.active()
        );
        if (Boolean.TRUE.equals(request.clearCategory())) habit.setCategory(null);
        if (request.categoryId() != null) {
            habit.setCategory(categoryService.getById(user, request.categoryId()));
        }
        if (request.tags() != null) {
            habit.setTags(request.tags());
        }
        return HabitResponse.from(habit);
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
        user = users.lockById(user.getId()).orElseThrow();
        Habit habit = getHabit(user, id);
        habit.update(null, null, null, null, null, false);
    }

    private void requireCapacity(AppUser user) {
        if (!user.isPremium() && habitRepository.countByUserIdAndActiveTrue(user.getId()) >= PremiumController.FREE_MAX_HABITS) {
            throw new IllegalStateException("Bạn đã đạt giới hạn " + PremiumController.FREE_MAX_HABITS
                    + " thói quen. Tắt một thói quen hoặc nâng cấp Premium để bật thêm.");
        }
    }
}
