-- New backdated activity checks look up the most recent state for one habit
-- on or before an account-calendar date.  Keep that lookup bounded as users
-- accumulate pause/restore history.
CREATE INDEX IF NOT EXISTS idx_habit_state_history_habit_calendar
    ON habit_state_history(habit_id, calendar_date DESC, id DESC);
