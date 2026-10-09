package com.selfforge.discipline.export;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.auth.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/profile/data")
public class PersonalDataController {
    private final CurrentUserService current;
    private final JdbcTemplate jdbc;
    public PersonalDataController(CurrentUserService current, JdbcTemplate jdbc) { this.current = current; this.jdbc = jdbc; }

    @GetMapping
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ResponseEntity<Map<String, Object>> export(HttpServletRequest request) {
        var user = current.requireUser(request);
        var result = new LinkedHashMap<String, Object>();
        result.put("formatVersion", 1);
        result.put("exportedAt", java.time.Instant.now().toString());
        result.put("profile", UserResponse.from(user));
        // Explicit allowlist: never export passwords, tokens, OTPs, or internal request receipts.
        var columns = new LinkedHashMap<String, String>();
        columns.put("habit", "id,name,description,difficulty,target_per_week,points,active,tags,sort_order,stack_group,created_at");
        columns.put("category", "id,name,color,icon,created_at");
        columns.put("journal_entry", "id,date,win,obstacle,lesson,tomorrow_focus,created_at");
        columns.put("mood_entry", "id,mood_date,score,emoji,note,created_at");
        columns.put("goal", "id,name,description,current_value,target_value,unit,deadline,status,created_at");
        columns.put("challenge", "id,habit_id,name,description,start_date,end_date,target_days,status,created_at");
        columns.put("pomodoro_session", "id,habit_id,started_at,ended_at,duration_minutes,completed,note");
        columns.put("reminder", "id,habit_id,reminder_time,days_of_week,message,enabled,created_at");
        columns.put("streak_freeze", "id,habit_id,freeze_date,used_at");
        columns.put("custom_reward", "id,name,description,xp_cost,claimed,claimed_at,created_at");
        columns.put("penalty", "id,habit_id,date,type,reason,xp_deducted,reversed,check_in_id,created_at");
        columns.put("weekly_review", "id,week_start,rating,wins,improvements,next_week_plan,created_at");
        columns.put("user_level", "id,total_xp,level,current_level_xp,next_level_xp");
        for (var entry : columns.entrySet()) result.put(entry.getKey(), rows(
                "select " + entry.getValue() + " from " + entry.getKey() + " where user_id = ? order by id", user.getId()));
        result.put("habit_categories", rows("select h.id as habit_id,c.id as category_id,c.name,c.color,c.icon from habit h join category c on c.id=h.category_id where h.user_id=? and (c.user_id is null or c.user_id=h.user_id) order by h.id", user.getId()));
        result.put("check_in_xp_adjustments", rows("select a.id,a.check_in_id,a.from_status,a.to_status,a.delta,a.created_at from check_in_xp_adjustment a join daily_check_in c on c.id=a.check_in_id join habit h on h.id=c.habit_id where h.user_id=? order by a.id", user.getId()));
        result.put("check_ins", rows("select c.id,c.habit_id,c.check_date,c.status,c.note,c.created_at,c.applied_xp,c.points_snapshot,c.failure_points_snapshot from daily_check_in c join habit h on h.id=c.habit_id where h.user_id=? order by c.id", user.getId()));
        result.put("achievements", rows("select u.id,u.earned_at,a.code,a.name,a.description,a.xp_reward from user_achievement u join achievement a on a.id=u.achievement_id where u.user_id=? order by u.id", user.getId()));
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .header("Content-Disposition", "attachment; filename=selfforge-personal-data.json").body(result);
    }

    private List<Map<String, Object>> rows(String sql, Long userId) {
        return jdbc.query(sql, (rs, rowNum) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            var metadata = rs.getMetaData();
            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                Object value = rs.getObject(i);
                if (value instanceof java.util.Date || value instanceof java.time.temporal.TemporalAccessor) value = value.toString();
                row.put(metadata.getColumnLabel(i).toLowerCase(Locale.ROOT), value);
            }
            return row;
        }, userId);
    }
}
