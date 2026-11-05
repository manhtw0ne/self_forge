package com.selfforge.discipline.journal;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static com.selfforge.discipline.journal.JournalRequests.SaveJournalRequest;

@Service
@Transactional
public class JournalService {

    private final UserTime userTime;
    private final com.selfforge.discipline.auth.AppUserRepository users;

    private final JournalRepository journalRepository;

    public JournalService(JournalRepository journalRepository, UserTime userTime, com.selfforge.discipline.auth.AppUserRepository users) {
        this.userTime = userTime;
        this.users = users;
        this.journalRepository = journalRepository;
    }

    public record SearchHit(LocalDate date,String field,String excerpt) {}
    public record SearchPage(String query,String field,java.util.List<SearchHit> items,LocalDate nextCursor,LocalDate fromDate,LocalDate toDate) {}
    @Transactional(readOnly = true)
    public SearchPage search(AppUser user,String query,String field,LocalDate before,LocalDate fromDate,LocalDate toDate) {
        String term=query==null?"":query.trim();String selected=field==null?"ALL":field;
        if(term.isEmpty()||term.length()>100||!java.util.List.of("ALL","win","obstacle","lesson","tomorrowFocus").contains(selected)||(before!=null&&(before.getYear()<1||before.getYear()>9999)))throw new IllegalArgumentException("Invalid journal search");
        var today=userTime.today(user);var from=fromDate==null?LocalDate.of(1,1,1):fromDate;var through=toDate==null?today:toDate;
        if(from.getYear()<1||through.getYear()<1||through.isAfter(today)||from.isAfter(through))throw new IllegalArgumentException("Invalid journal search dates");
        var rows=journalRepository.search(user.getId(),term,selected,before==null?today.plusDays(1):before,through,from,org.springframework.data.domain.PageRequest.of(0,21));
        var hits=rows.stream().limit(20).map(row->{
            String[] fields={"win","obstacle","lesson","tomorrowFocus"};String[] values={text(row.getWin()),text(row.getObstacle()),text(row.getLesson()),text(row.getTomorrowFocus())};
            for(int i=0;i<fields.length;i++){if(!selected.equals("ALL")&&!selected.equals(fields[i]))continue;int match=values[i].toLowerCase(java.util.Locale.ROOT).indexOf(term.toLowerCase(java.util.Locale.ROOT));if(match<0)continue;int start=Math.max(0,match-40),end=Math.min(values[i].length(),start+180);return new SearchHit(row.getDate(),fields[i],values[i].substring(start,end));}
            throw new IllegalStateException("Journal search result could not be verified");
        }).toList();
        return new SearchPage(term,selected,hits,rows.size()>20?hits.getLast().date():null,from,through);
    }

    public JournalResponse save(AppUser user, SaveJournalRequest request) {
        users.lockById(user.getId()).orElseThrow();
        LocalDate date = request.date() == null ? userTime.today(user) : request.date();
        var previous = journalRepository.findByUserIdAndDate(user.getId(), date);
        if (request.expected() != null) {
            var expected = request.expected();
            var current = previous.orElse(null);
            boolean matches = current == null ? expected.id() == null :
                    java.util.Objects.equals(expected.id(), current.getId()) &&
                    text(expected.win()).equals(text(current.getWin())) && text(expected.obstacle()).equals(text(current.getObstacle())) &&
                    text(expected.lesson()).equals(text(current.getLesson())) && text(expected.tomorrowFocus()).equals(text(current.getTomorrowFocus()));
            if (!matches) throw new IllegalStateException("Nội dung trên máy chủ đã thay đổi. Bản nháp được giữ; tải bản mới trước khi lưu tiếp.");
        }
        JournalEntry entry = previous
                .map(existing -> {
                    existing.update(request.win(), request.obstacle(), request.lesson(), request.tomorrowFocus());
                    return existing;
                })
                .orElseGet(() -> journalRepository.save(new JournalEntry(
                        user,
                        date,
                        request.win(),
                        request.obstacle(),
                        request.lesson(),
                        request.tomorrowFocus()
                )));
        return JournalResponse.from(entry);
    }

    public void delete(AppUser user,JournalRequests.DeleteJournalRequest request) {
        users.lockById(user.getId()).orElseThrow();var expected=request.expected();
        if(expected==null||expected.id()==null||expected.id()<1||request.date()==null||request.date().getYear()<1||request.date().getYear()>9999)throw new IllegalArgumentException("Invalid journal deletion");
        var current=journalRepository.findByUserIdAndDate(user.getId(),request.date()).orElse(null);
        if(current==null)return;
        if(!java.util.Objects.equals(expected.id(),current.getId())||!text(expected.win()).equals(text(current.getWin()))||!text(expected.obstacle()).equals(text(current.getObstacle()))||!text(expected.lesson()).equals(text(current.getLesson()))||!text(expected.tomorrowFocus()).equals(text(current.getTomorrowFocus())))throw new IllegalStateException("Nội dung trên máy chủ đã thay đổi. Tải bản mới và kiểm tra trước khi xóa.");
        journalRepository.delete(current);
    }

    private static String text(String value) { return value == null ? "" : value; }

    @Transactional(readOnly = true)
    public JournalResponse get(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? userTime.today(user) : date;
        return journalRepository.findByUserIdAndDate(user.getId(), selectedDate)
                .map(JournalResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Journal entry for " + selectedDate + " does not exist"));
    }

    @Transactional(readOnly = true)
    public java.util.List<LocalDate> listDates(AppUser user) {
        return journalRepository.findDatesByUserId(user.getId());
    }
}
