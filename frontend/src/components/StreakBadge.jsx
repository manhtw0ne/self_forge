import { useLanguage } from '../context/useLanguage';

/**
 * Compact streak badge shown inside habit cards.
 * Shows the server-calculated completion streak without trying to reinterpret
 * the schedule in the client.
 *
 * @param {object} props
 * @param {number} props.streak - current streak count (in completed-day units)
 * @param {boolean} [props.frozen=false] - whether the streak is currently freeze-protected
 */
export default function StreakBadge({ streak, frozen = false }) {
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
