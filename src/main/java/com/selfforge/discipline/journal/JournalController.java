package com.selfforge.discipline.journal;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

import static com.selfforge.discipline.journal.JournalRequests.SaveJournalRequest;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JournalService journalService;
    private final CurrentUserService currentUserService;

    public JournalController(JournalService journalService, CurrentUserService currentUserService) {
        this.journalService = journalService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public JournalResponse get(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest servletRequest
    ) {
        return journalService.get(currentUserService.requireUser(servletRequest), date);
    }

    @GetMapping("/search")
    public JournalService.SearchPage search(@RequestParam String q,@RequestParam(defaultValue="ALL") String field,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate before,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fromDate,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate toDate,HttpServletRequest servletRequest) {
        return journalService.search(currentUserService.requireUser(servletRequest),q,field,before,fromDate,toDate);
    }

    @GetMapping("/dates")
    public List<LocalDate> dates(HttpServletRequest servletRequest) {
        return journalService.listDates(currentUserService.requireUser(servletRequest));
    }

    @org.springframework.web.bind.annotation.DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Valid @RequestBody JournalRequests.DeleteJournalRequest request,HttpServletRequest servletRequest) {
        journalService.delete(currentUserService.requireUser(servletRequest),request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JournalResponse save(@Valid @RequestBody SaveJournalRequest request, HttpServletRequest servletRequest) {
        return journalService.save(currentUserService.requireUser(servletRequest), request);
    }
}

