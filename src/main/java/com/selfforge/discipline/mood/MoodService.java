package com.selfforge.discipline.mood;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static com.selfforge.discipline.mood.MoodRequests.SaveMoodRequest;

@Service
@Transactional
public class MoodService {

    private final UserTime userTime;
    private final com.selfforge.discipline.auth.AppUserRepository users;

    private final MoodRepository moodRepository;

    public MoodService(MoodRepository moodRepository, UserTime userTime, com.selfforge.discipline.auth.AppUserRepository users) {
        this.userTime = userTime;
        this.users = users;
        this.moodRepository = moodRepository;
    }

    public MoodResponse saveOrUpdate(AppUser user, SaveMoodRequest request) {
        users.lockById(user.getId()).orElseThrow();
        LocalDate date = request.date() == null ? userTime.today(user) : request.date();
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
        return moodRepository.findByUserIdAndDate(user.getId(), userTime.today(user))
                .map(MoodResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MoodResponse> getHistory(AppUser user, int days) {
        LocalDate end = userTime.today(user);
        if (days < 1 || days > 366) throw new IllegalArgumentException("History days must be between 1 and 366");
        LocalDate start = end.minusDays(days - 1L);
        return moodRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(), start, end)
                .stream().map(MoodResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public double weeklyAverage(AppUser user) {
        LocalDate end = userTime.today(user);
        LocalDate start = end.minusDays(6);
        List<MoodEntry> entries = moodRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
        if (entries.isEmpty()) return 0;
        return entries.stream().mapToInt(MoodEntry::getScore).average().orElse(0);
    }
}
