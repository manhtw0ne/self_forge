-- V23: Add performance indexes for high-traffic queries.
-- These are safe to add at any time; concurrent index creation is not needed on new installations.
-- On a live PostgreSQL instance with significant data, consider running these manually as CONCURRENTLY.

-- daily_check_in: streak queries scan by habit_id+date range heavily.
-- Note: daily_check_in does not have a direct user_id column; user filtering is via habit join.
-- The unique constraint (habit_id, check_date) already implies an index on those columns.
-- Add a covering index to support date-range streak and history queries efficiently:
create index if not exists idx_daily_check_in_habit_date_status
    on daily_check_in (habit_id, check_date, status);

-- streak_freeze: freeze lookup by user+habit+date
create index if not exists idx_streak_freeze_user_habit_date
    on streak_freeze (user_id, habit_id, freeze_date);

-- goal_progress_receipt: idempotency lookup by goal+key
create index if not exists idx_goal_progress_receipt_goal_key
    on goal_progress_receipt (goal_id, request_key);

-- challenge: list challenges per user, filtered by status
create index if not exists idx_challenge_user_status
    on challenge (user_id, status);

-- pomodoro_session: history queries ordered by time
create index if not exists idx_pomodoro_session_user_started
    on pomodoro_session (user_id, started_at desc);

-- journal_entry: calendar and date-range queries (column is 'date', not 'entry_date')
create index if not exists idx_journal_entry_user_date
    on journal_entry (user_id, date);

-- mood_entry: monthly mood queries
create index if not exists idx_mood_entry_user_date
    on mood_entry (user_id, mood_date);

-- habit: active habit lookup per user
create index if not exists idx_habit_user_active
    on habit (user_id, active);

-- auth_session: user-scoped session list (e.g. for session manager)
create index if not exists idx_auth_session_user_id
    on auth_session (user_id);
