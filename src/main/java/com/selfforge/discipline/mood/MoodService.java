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
        if(date.getYear()<1||date.getYear()>9999||date.isAfter(userTime.today(user)))throw new IllegalArgumentException("Invalid mood date");
        var previous=moodRepository.findByUserIdAndDate(user.getId(),date);
        if(request.expected()!=null){
            var expected=request.expected();var current=previous.orElse(null);
            if(expected.id()==null)throw new IllegalArgumentException("Missing mood snapshot ID");
            if(current!=null&&expected.id().equals(current.getId())&&request.score()==current.getScore()&&text(request.note()==null?current.getNote():request.note()).equals(text(current.getNote()))&&text(request.emoji()==null?current.getEmoji():request.emoji()).equals(text(current.getEmoji())))return MoodResponse.from(current);
            if(current==null||!expected.id().equals(current.getId())||expected.score()!=current.getScore()||!text(expected.note()).equals(text(current.getNote()))||!text(expected.emoji()).equals(text(current.getEmoji())))throw new IllegalStateException("Tâm trạng đã thay đổi. Tải bản mới và kiểm tra trước khi lưu.");
        }
        MoodEntry entry = previous
                .map(existing -> {
                    existing.update(request.score(), request.emoji(), request.note());
                    return existing;
                })
                .orElseGet(() -> moodRepository.save(new MoodEntry(
                        user, date, request.score(), request.emoji(), request.note()
                )));
        return MoodResponse.from(entry);
    }

    public void delete(AppUser user,MoodRequests.DeleteMoodRequest request) {
        users.lockById(user.getId()).orElseThrow();var expected=request.expected();var date=request.date();
        if(date==null||date.getYear()<1||date.getYear()>9999||date.isAfter(userTime.today(user))||expected==null||expected.id()==null||expected.id()<1)throw new IllegalArgumentException("Invalid mood deletion");
        var current=moodRepository.findByUserIdAndDate(user.getId(),date).orElse(null);if(current==null)return;
        if(!expected.id().equals(current.getId())||expected.score()!=current.getScore()||!text(expected.note()).equals(text(current.getNote()))||!text(expected.emoji()).equals(text(current.getEmoji())))throw new IllegalStateException("Tâm trạng đã thay đổi. Tải bản mới và kiểm tra trước khi xóa.");
        moodRepository.delete(current);
    }

    private static String text(String value){return value==null?"":value;}
    @Transactional(readOnly = true)
    public MoodResponse getByDate(AppUser user,LocalDate selected) {
        var date=selected==null?userTime.today(user):selected;
        if(date.getYear()<1||date.getYear()>9999||date.isAfter(userTime.today(user)))throw new IllegalArgumentException("Invalid mood date");
        return moodRepository.findByUserIdAndDate(user.getId(),date).map(MoodResponse::from).orElse(null);
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

    public record MonthEntry(Long id,LocalDate date,int score) {}
    public record MonthHistory(java.time.YearMonth month,LocalDate startDate,LocalDate endDate,LocalDate observedThrough,String timezone,List<MonthEntry> entries) {}
    @Transactional(readOnly = true)
    public MonthHistory monthHistory(AppUser user,java.time.YearMonth selected) {
        var today=userTime.today(user);var current=java.time.YearMonth.from(today);var month=selected==null?current:selected;
        if(month.isAfter(current)||month.isBefore(current.minusMonths(23)))throw new IllegalArgumentException("Invalid mood month");
        var start=month.atDay(1);var end=month.atEndOfMonth();var through=end.isAfter(today)?today:end;
        var entries=moodRepository.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(),start,through).stream().map(row->new MonthEntry(row.getId(),row.getDate(),row.getScore())).toList();
        return new MonthHistory(month,start,end,through,userTime.zone(user).getId(),entries);
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
