package com.selfforge.discipline.goal;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    private String name;
    private String description;
    private int targetValue;
    private int currentValue;
    private String unit; // "cuốn", "km", "buổi", etc.
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    private GoalStatus status;

    private Instant createdAt;

    protected Goal() {}

    public Goal(AppUser user, String name, String description, int targetValue, String unit, LocalDate deadline) {
        if (targetValue <= 0) throw new IllegalArgumentException("Chỉ tiêu phải lớn hơn 0.");
        this.user = user;
        this.name = name;
        this.description = description;
        this.targetValue = targetValue;
        this.currentValue = 0;
        this.unit = unit;
        this.deadline = deadline;
        this.status = GoalStatus.ACTIVE;
        this.createdAt = Instant.now();
    }

    public void addProgress(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Tiến độ phải lớn hơn 0.");
        if (status != GoalStatus.ACTIVE) throw new IllegalStateException("Mục tiêu đã kết thúc, không thể thêm tiến độ.");
        this.currentValue = (int) Math.min((long) this.currentValue + amount, this.targetValue);
        if (this.currentValue >= this.targetValue) {
            this.status = GoalStatus.COMPLETED;
        }
    }

    public void correctProgress(int value) {
        if (status == GoalStatus.ABANDONED) throw new IllegalStateException("Khôi phục mục tiêu trước khi điều chỉnh tiến độ.");
        if (value < 0 || value > targetValue) throw new IllegalArgumentException("Số lượng thực tế phải từ 0 đến chỉ tiêu.");
        currentValue = value;
        status = value == targetValue ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;
    }

    public void update(String name, String description, Integer targetValue, String unit, LocalDate deadline) {
        if (targetValue != null && targetValue <= 0) throw new IllegalArgumentException("Chỉ tiêu phải lớn hơn 0.");
        if (targetValue != null && targetValue != this.targetValue && status != GoalStatus.ACTIVE) {
            throw new IllegalStateException("Không thể đổi chỉ tiêu của mục tiêu đã kết thúc. Hãy tạo mục tiêu mới.");
        }
        if (name != null && name.isBlank()) throw new IllegalArgumentException("Tên mục tiêu không được để trống.");
        if (name != null) this.name = name;
        if (description != null) this.description = description;
        if (targetValue != null && targetValue > 0) this.targetValue = targetValue;
        if (unit != null) this.unit = unit;
        if (deadline != null) this.deadline = deadline;
        if (status == GoalStatus.ACTIVE && currentValue >= this.targetValue) status = GoalStatus.COMPLETED;
    }

    public void abandon() {
        if (status == GoalStatus.COMPLETED) throw new IllegalStateException("Mục tiêu đã hoàn thành không thể chuyển sang bỏ dở.");
        this.status = GoalStatus.ABANDONED;
    }

    public void restore() {
        if (status == GoalStatus.COMPLETED) throw new IllegalStateException("Mục tiêu đã hoàn thành không thể khôi phục.");
        this.status = GoalStatus.ACTIVE;
    }

    public void clearDeadline() { this.deadline = null; }

    public double getProgress() {
        return targetValue == 0 ? 0 : Math.min(1.0, Math.max(0.0, (double) currentValue / targetValue));
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getTargetValue() { return targetValue; }
    public int getCurrentValue() { return currentValue; }
    public String getUnit() { return unit; }
    public LocalDate getDeadline() { return deadline; }
    public GoalStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
