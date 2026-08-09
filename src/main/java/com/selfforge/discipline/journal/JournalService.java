package com.selfforge.discipline.journal;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static com.selfforge.discipline.journal.JournalRequests.SaveJournalRequest;

@Service
@Transactional
public class JournalService {

    private final JournalRepository journalRepository;

    public JournalService(JournalRepository journalRepository) {
        this.journalRepository = journalRepository;
    }

    public JournalResponse save(AppUser user, SaveJournalRequest request) {
        LocalDate date = request.date() == null ? LocalDate.now() : request.date();
        JournalEntry entry = journalRepository.findByUserIdAndDate(user.getId(), date)
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

    @Transactional(readOnly = true)
    public JournalResponse get(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? LocalDate.now() : date;
        return journalRepository.findByUserIdAndDate(user.getId(), selectedDate)
                .map(JournalResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Journal entry for " + selectedDate + " does not exist"));
    }

    @Transactional(readOnly = true)
    public java.util.List<LocalDate> listDates(AppUser user) {
        return journalRepository.findDatesByUserId(user.getId());
    }
}
