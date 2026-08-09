package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
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

    public HabitService(HabitRepository habitRepository, CategoryService categoryService) {
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

    public HabitResponse create(AppUser user, CreateHabitRequest request) {
        int targetPerWeek = request.targetPerWeek() == null ? 7 : request.targetPerWeek();
        Category category = categoryService.getById(request.categoryId());
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

    public HabitResponse update(AppUser user, Long id, UpdateHabitRequest request) {
        Habit habit = getHabit(user, id);
        habit.update(
                request.name(),
                request.description(),
                request.difficulty(),
                request.targetPerWeek(),
                request.points(),
                request.active()
        );
        if (request.categoryId() != null) {
            habit.setCategory(categoryService.getById(request.categoryId()));
        }
        if (request.tags() != null) {
            habit.setTags(request.tags());
        }
        return HabitResponse.from(habit);
    }

    public void deactivate(AppUser user, Long id) {
        Habit habit = getHabit(user, id);
        habit.update(null, null, null, null, null, false);
    }
}

