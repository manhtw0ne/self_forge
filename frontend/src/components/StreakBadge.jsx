import { useLanguage } from '../context/useLanguage';

/**
 * Compact streak badge shown inside habit cards.
 * Respects targetPerWeek: shows e.g. "🔥 5 ngày" for daily habits,
 * or "🔥 3 tuần" for 5/7 habits where 5 consecutive required days = 1 week.
 *
 * @param {object} props
 * @param {number} props.streak - current streak count (in completed-day units)
 * @param {number} [props.targetPerWeek=7] - how many days/week this habit targets
 * @param {boolean} [props.frozen=false] - whether the streak is currently freeze-protected
 */
export default function StreakBadge({ streak, targetPerWeek = 7, frozen = false }) {
  const { t } = useLanguage();
  if (!streak || streak <= 0) return null;

  const label = streak === 1
    ? t('{n} ngày', { n: streak })
    : t('{n} ngày', { n: streak });

  return (
    <span className={`streak-badge${frozen ? ' streak-frozen' : ''}`} title={t('Streak hiện tại: {streak} lần hoàn thành liên tiếp', { streak })}>
      <span className="streak-badge-fire" aria-hidden="true">{frozen ? '🧊' : '🔥'}</span>
      {label}
    </span>
  );
}
