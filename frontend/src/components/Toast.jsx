import { useToast } from '../context/useToast';
import { useLanguage } from '../context/useLanguage';

const icons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

export default function Toast() {
  const { toasts, removeToast } = useToast();
  const { t: translate } = useLanguage();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} toast-enter`}
          role={t.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
          <span className="toast-icon" aria-hidden="true">{icons[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button type="button" className="toast-close" aria-label={translate('Đóng thông báo')} onClick={() => removeToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
