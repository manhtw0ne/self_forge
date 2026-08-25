package com.selfforge.discipline.review;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "week_start"}))
public class WeeklyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(length = 2000)
    private String wins;

    @Column(length = 2000)
    private String improvements;

    @Column(length = 2000)
    private String nextWeekPlan;

    private int rating; // 1-5

    private Instant createdAt;

    protected WeeklyReview() {}

    public WeeklyReview(AppUser user, LocalDate weekStart, String wins, String improvements, String nextWeekPlan, int rating) {
        this.user = user;
        this.weekStart = weekStart;
        this.wins = wins;
        this.improvements = improvements;
        this.nextWeekPlan = nextWeekPlan;
        this.rating = Math.max(1, Math.min(5, rating));
        this.createdAt = Instant.now();
    }

    public void update(String wins, String improvements, String nextWeekPlan, int rating) {
        this.wins = wins;
        this.improvements = improvements;
        this.nextWeekPlan = nextWeekPlan;
        this.rating = Math.max(1, Math.min(5, rating));
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public LocalDate getWeekStart() { return weekStart; }
    public String getWins() { return wins; }
    public String getImprovements() { return improvements; }
    public String getNextWeekPlan() { return nextWeekPlan; }
    public int getRating() { return rating; }
    public Instant getCreatedAt() { return createdAt; }
}
