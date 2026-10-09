import { useLanguage } from '../context/useLanguage';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <span>{t('Ngôn ngữ')}</span>
      <select className="form-input" style={{ width: 'auto', minWidth: '8rem' }}
        value={language} onChange={event => setLanguage(event.target.value)}>
        <option value="vi" lang="vi">Tiếng Việt</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  );
}
