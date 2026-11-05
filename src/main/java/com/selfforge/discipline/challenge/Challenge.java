package com.selfforge.discipline.challenge;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Challenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Habit habit;

    @NotBlank
    private String name;

    private String description;

    private LocalDate startDate;

    private LocalDate endDate;

    @Min(1)
    private int targetDays;

    @Enumerated(EnumType.STRING)
    private ChallengeStatus status;

    private Instant createdAt;

    protected Challenge() {
    }

    public Challenge(AppUser user, Habit habit, String name, String description, LocalDate startDate, int targetDays) {this(user,habit,name,description,startDate,targetDays,targetDays);}

    public Challenge(AppUser user, Habit habit, String name, String description, LocalDate startDate, int targetDays,int windowDays) {
        if(targetDays<1||targetDays>365||windowDays<targetDays||windowDays>365)throw new IllegalArgumentException("Khoảng thử thách phải từ số ngày cần hoàn thành đến 365 ngày.");
        if(startDate.getYear()<1||startDate.getYear()>9999||startDate.plusDays(windowDays-1L).getYear()>9999)throw new IllegalArgumentException("Ngày thử thách không hợp lệ.");
        this.user = user;
        this.habit = habit;
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.targetDays = targetDays;
        this.endDate = startDate.plusDays(windowDays - 1L);
        this.status = ChallengeStatus.ACTIVE;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public Habit getHabit() {
        return habit;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public int getTargetDays() {
        return targetDays;
    }

    public ChallengeStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void updateStatus(ChallengeStatus status) {
        this.status = status;
    }
}
