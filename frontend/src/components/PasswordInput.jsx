import { useEffect, useState } from 'react';
import { useLanguage } from '../context/useLanguage';

export default function PasswordInput(props) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  useEffect(() => { if (!props.value) setVisible(false); }, [props.value]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') { setVisible(false); setCapsLock(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const checkCaps = event => setCapsLock(event.getModifierState?.('CapsLock') || false);
  const hint = props.id + '-caps-lock';
  return <>
    <div className="password-input-row">
      <input {...props} type={visible ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        aria-describedby={[props['aria-describedby'], capsLock ? hint : null].filter(Boolean).join(' ') || undefined}
        onKeyDown={event => { checkCaps(event); props.onKeyDown?.(event); }}
        onKeyUp={event => { checkCaps(event); props.onKeyUp?.(event); }}
        onBlur={event => { setCapsLock(false); props.onBlur?.(event); }} />
      <button type="button" className="btn btn-secondary password-visibility" disabled={props.disabled}
        aria-controls={props.id} aria-pressed={visible} aria-label={t(visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}
        onClick={() => setVisible(value => !value)}>{t(visible ? 'Ẩn' : 'Hiện')}</button>
    </div>
    {capsLock && <small id={hint} role="status">{t('Caps Lock đang bật.')}</small>}
  </>;
}
