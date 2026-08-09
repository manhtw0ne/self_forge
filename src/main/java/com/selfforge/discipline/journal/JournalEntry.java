package com.selfforge.discipline.journal;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "date"}))
public class JournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private AppUser user;

    @Column(nullable = false)
    private LocalDate date;

    private String win;

    private String obstacle;

    private String lesson;

    private String tomorrowFocus;

    private Instant createdAt;

    protected JournalEntry() {
    }

    public JournalEntry(AppUser user, LocalDate date, String win, String obstacle, String lesson, String tomorrowFocus) {
        this.user = user;
        this.date = date;
        this.win = win;
        this.obstacle = obstacle;
        this.lesson = lesson;
        this.tomorrowFocus = tomorrowFocus;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getWin() {
        return win;
    }

    public String getObstacle() {
        return obstacle;
    }

    public String getLesson() {
        return lesson;
    }

    public String getTomorrowFocus() {
        return tomorrowFocus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void update(String win, String obstacle, String lesson, String tomorrowFocus) {
        this.win = win;
        this.obstacle = obstacle;
        this.lesson = lesson;
        this.tomorrowFocus = tomorrowFocus;
    }
}
