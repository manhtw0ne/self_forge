package com.selfforge.discipline.mood;

import com.selfforge.discipline.auth.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static com.selfforge.discipline.mood.MoodRequests.SaveMoodRequest;

@Service
@Transactional
public class MoodService {

    private final MoodRepository moodRepository;

    public MoodService(MoodRepository moodRepository) {
        this.moodRepository = moodRepository;
    }

    public MoodResponse saveOrUpdate(AppUser user, SaveMoodRequest request) {
        LocalDate date = request.date() == null ? LocalDate.now() : request.date();
        MoodEntry entry = moodRepository.findByUserIdAndDate(user.getId(), date)
                .map(existing -> {
                    existing.update(request.score(), request.emoji(), request.note());
                    return existing;
                })
                .orElseGet(() -> moodRepository.save(new MoodEntry(
                        user, date, request.score(), request.emoji(), request.note()
                )));
        return MoodResponse.from(entry);
    }

    @Transactional(readOnly = true)
    public MoodResponse getToday(AppUser user) {
        return moodRepository.findByUserIdAndDate(user.getId(), LocalDate.now())
                .map(MoodResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MoodResponse> getHistory(AppUser user, int days) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(days);
        return moodRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(), start, end)
                .stream().map(MoodResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public double weeklyAverage(AppUser user) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(7);
        List<MoodEntry> entries = moodRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
        if (entries.isEmpty()) return 0;
        return entries.stream().mapToInt(MoodEntry::getScore).average().orElse(0);
    }
}
