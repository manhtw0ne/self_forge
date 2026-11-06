package com.selfforge.discipline.auth;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountDeletionService {
    private final CurrentUserService current;
    private final AppUserRepository users;
    private final EntityManager entityManager;
    private final PasswordHasher passwords;
    private final AccountDeletionLimiter limiter;
    private final JdbcTemplate jdbc;

    public AccountDeletionService(CurrentUserService current, AppUserRepository users, EntityManager entityManager,
            PasswordHasher passwords, AccountDeletionLimiter limiter, JdbcTemplate jdbc) {
        this.current = current; this.users = users; this.entityManager = entityManager;
        this.passwords = passwords; this.limiter = limiter; this.jdbc = jdbc;
    }

    @Transactional
    public void delete(HttpServletRequest request, String password, String confirmationEmail) {
        Long id = current.requireUser(request).getId();
        limiter.acquire(id);
        AppUser user = users.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        entityManager.refresh(user);
        // Recheck the session after the lock: a simultaneous password change may have revoked it.
        current.requireUser(request);
        if (!user.getEmail().equals(confirmationEmail.trim().toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Email xác nhận không khớp tài khoản.");
        }
        if (!passwords.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng.");
        }
        // Explicit allowlist and dependency order. Shared categories/achievements are preserved.
        jdbc.update("delete from goal_progress_correction where goal_id in (select id from goal where user_id = ?)", id);
        jdbc.update("delete from goal_progress_receipt where goal_id in (select id from goal where user_id = ?)", id);
        jdbc.update("delete from check_in_xp_adjustment where check_in_id in (select c.id from daily_check_in c join habit h on h.id = c.habit_id where h.user_id = ?)", id);
        for (String table : List.of("penalty", "challenge_create_receipt", "reminder_create_receipt","reward_create_receipt", "habit_batch_receipt", "goal_create_receipt", "challenge",
                "companion_milestone_ack", "companion_preference", "week_action_plan", "daily_focus_plan", "goal_habit_plan", "restart_archive", "restart_days", "restart_review", "restart_plan", "reminder", "streak_freeze", "pomodoro_session",
                "ai_coach_usage", "weekly_coach_advice", "goal_coach_plan", "oauth_login_ticket", "oauth_identity", "oauth_native_handoff")) {
            jdbc.update("delete from " + table + " where user_id = ?", id);
        }
        jdbc.update("delete from daily_check_in where habit_id in (select id from habit where user_id = ?)", id);
        jdbc.update("delete from habit_state_history where habit_id in (select id from habit where user_id = ?)", id);
        // Payment events remain as de-linked reconciliation records; the order itself is personal data.
        jdbc.update("delete from payment_order where user_id = ?", id);
        for (String table : List.of("habit", "category", "goal", "journal_entry", "mood_entry", "weekly_review", "feedback_submission",
                "custom_reward", "user_achievement", "user_level", "password_reset_code", "email_change_code", "email_change_recovery", "auth_session", "account_security_event")) {
            jdbc.update("delete from " + table + " where user_id = ?", id);
        }
        jdbc.update("delete from registration_code where email = ?", user.getEmail());
        jdbc.update("delete from app_user where id = ?", id);
        entityManager.clear();
    }
}
