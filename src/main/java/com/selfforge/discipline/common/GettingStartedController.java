package com.selfforge.discipline.common;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.journal.JournalRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
@RestController @RequestMapping("/api/getting-started") @Transactional(readOnly=true)
public class GettingStartedController {
 private final CurrentUserService current;private final HabitRepository habits;private final DailyCheckInRepository checkIns;private final JournalRepository journals;private final UserTime time;
 public GettingStartedController(CurrentUserService current,HabitRepository habits,DailyCheckInRepository checkIns,JournalRepository journals,UserTime time){this.current=current;this.habits=habits;this.checkIns=checkIns;this.journals=journals;this.time=time;}
 public record Response(LocalDate observedThrough,String timezone,boolean activeHabit,boolean completedCheckIn,boolean journalEntry){}
 @GetMapping public Response get(HttpServletRequest request){var user=current.requireUser(request);var today=time.today(user);return new Response(today,time.zone(user).getId(),habits.countByUserIdAndActiveTrue(user.getId())>0,checkIns.existsByHabit_User_IdAndStatusAndDateLessThanEqual(user.getId(),CheckInStatus.COMPLETED,today),journals.existsByUserIdAndDateLessThanEqual(user.getId(),today));}
}
