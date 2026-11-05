export function clearAccountDrafts(storage, userId) {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Invalid draft owner');
  const exact = new Set([`sf_small_step:${userId}`,`sf_habit_categories:${userId}`,`sf_reward_create:${userId}`,`sf_focus_history_view:${userId}`,`sf_dashboard_panels:${userId}`,`sf_pomodoro_alarm:${userId}`,`sf_daily_focus:${userId}`, `sf_goal_habit:${userId}`, `sf_restart_plan:${userId}`, `sf_restart_coach:${userId}`, "sf_goal_form:" + userId, "sf_goal_create:" + userId, "sf_getting_started:" + userId, "sf_reminder_create:" + userId, `sf_challenge_create:${userId}`, `sf_habit_batch:${userId}`, `sf_pomodoro_start:${userId}`, `sf_pomodoro_v1:${userId}`]);
  const prefixes = [`sf_reminder_snooze:${userId}:`,`sf_goal_plan_preferences:${userId}:`,`sf_week_plan:${userId}:`, `sf_goal_edit_form:${userId}:`, `sf_journal_draft:${userId}:`, `sf_journal_coach:${userId}:`, `sf_review_draft:${userId}:`, `sf_goal_progress_v1:${userId}:`, `sf_pomodoro_note_v1:${userId}:`];
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (exact.has(key) || prefixes.some(prefix => key?.startsWith(prefix))) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
