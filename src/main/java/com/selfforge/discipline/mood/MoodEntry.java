package com.selfforge.discipline.mood;

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
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "mood_date"}))
public class MoodEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @Column(name = "mood_date", nullable = false)
    private LocalDate date;

    private int score; // 1-5

    private String emoji;

    private String note;

    private Instant createdAt;

    protected MoodEntry() {
    }

    public MoodEntry(AppUser user, LocalDate date, int score, String emoji, String note) {
        this.user = user;
        this.date = date;
        this.score = Math.max(1, Math.min(5, score));
        this.emoji = emoji;
        this.note = note;
        this.createdAt = Instant.now();
    }

    public void update(int score, String emoji, String note) {
        this.score = Math.max(1, Math.min(5, score));
        if (emoji != null) this.emoji = emoji;
        if (note != null) this.note = note;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public LocalDate getDate() { return date; }
    public int getScore() { return score; }
    public String getEmoji() { return emoji; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
