package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;

@Entity
@Table(name = "ai_coach_usage", uniqueConstraints = @UniqueConstraint(
        name = "uq_ai_coach_usage_user_month_feature",
        columnNames = { "user_id", "usage_month", "feature" }))
public class AiCoachUsage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "usage_month", nullable = false)
    private LocalDate usageMonth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private AiCoachFeature feature;

    @Column(name = "request_count", nullable = false)
    private int requestCount;

    protected AiCoachUsage() {}

    AiCoachUsage(AppUser user, LocalDate usageMonth, AiCoachFeature feature) {
        this.user = user;
        this.usageMonth = usageMonth;
        this.feature = feature;
        this.requestCount = 0;
    }

    int getRequestCount() { return requestCount; }
    void increment() { requestCount += 1; }
}
