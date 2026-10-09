ALTER TABLE pomodoro_session ADD COLUMN start_request_id VARCHAR(36);
CREATE UNIQUE INDEX ux_pomodoro_start_request ON pomodoro_session(user_id, start_request_id);
