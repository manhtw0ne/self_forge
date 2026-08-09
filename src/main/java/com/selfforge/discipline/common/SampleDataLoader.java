package com.selfforge.discipline.common;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AuthService;
import com.selfforge.discipline.checkin.CheckInRequests;
import com.selfforge.discipline.checkin.CheckInService;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.habit.Difficulty;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.habit.HabitRequests;
import com.selfforge.discipline.habit.HabitResponse;
import com.selfforge.discipline.habit.HabitService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;

@Configuration
public class SampleDataLoader {

    @Bean
    CommandLineRunner loadSampleData(
            HabitRepository habitRepository,
            HabitService habitService,
            CheckInService checkInService,
            AuthService authService
    ) {
        return args -> {
            AppUser demoUser = authService.createUserIfMissing(
                    "demo@selfforge.local",
                    "Demo User",
                    "password123"
            );

            if (!habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(demoUser.getId()).isEmpty()) {
                return;
            }

            HabitResponse wakeUp = habitService.create(demoUser, new HabitRequests.CreateHabitRequest(
                    "Dậy sớm trước 6:00",
                    "Giữ lời hứa đầu tiên trong ngày",
                    Difficulty.HARD,
                    5,
                    null,
                    null,
                    null
            ));
            HabitResponse read = habitService.create(demoUser, new HabitRequests.CreateHabitRequest(
                    "Đọc sách 20 phút",
                    "Đọc ít nhất 10 trang hoặc 20 phút",
                    Difficulty.MEDIUM,
                    7,
                    null,
                    null,
                    null
            ));
            HabitResponse train = habitService.create(demoUser, new HabitRequests.CreateHabitRequest(
                    "Tập luyện",
                    "Tập gym, chạy bộ, hoặc workout tại nhà",
                    Difficulty.HARD,
                    4,
                    null,
                    null,
                    null
            ));

            LocalDate today = LocalDate.now();
            checkInService.upsert(demoUser, new CheckInRequests.UpsertCheckInRequest(
                    wakeUp.id(), today, CheckInStatus.COMPLETED, "Đã ra khỏi giường ngay khi báo thức"
            ));
            checkInService.upsert(demoUser, new CheckInRequests.UpsertCheckInRequest(
                    read.id(), today, CheckInStatus.COMPLETED, "Đọc xong một chương ngắn"
            ));
            checkInService.upsert(demoUser, new CheckInRequests.UpsertCheckInRequest(
                    train.id(), today.minusDays(1), CheckInStatus.COMPLETED, "30 phút upper body"
            ));
        };
    }
}
