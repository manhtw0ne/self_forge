import { useContext, useState } from 'react';
import { AppInstallContext } from '../context/AppInstallContext';
import { useLanguage } from '../context/useLanguage';

export default function InstallApp() {
  const { t } = useLanguage();
  const { available, installed, busy, install } = useContext(AppInstallContext);
  const [guide, setGuide] = useState(false);
  if (installed) return null;
  return <div style={{ marginBottom: '1rem' }}>
    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} disabled={busy} onClick={async () => {
      if (!available) { setGuide(value => !value); return; }
      try { await install(); } catch { setGuide(true); }
    }} aria-expanded={guide} aria-controls="app-install-guide">{t(busy ? 'Đang xử lý…' : available ? 'Cài SelfForge' : 'Thêm vào màn hình chính')}</button>
    {guide && <div id="app-install-guide" role="status" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
      <p>{t('Android: mở menu trình duyệt, chọn Cài ứng dụng hoặc Thêm vào màn hình chính.')}</p>
      <p>{t('iPhone/iPad: mở bằng Safari, chọn Chia sẻ rồi Thêm vào màn hình chính.')}</p>
      <p>{t('Ứng dụng cần internet để tải và lưu dữ liệu. Nếu không thấy tùy chọn cài, hãy tiếp tục dùng trên trình duyệt.')}</p>
      <button className="btn btn-secondary btn-sm" onClick={() => setGuide(false)}>{t('Đóng')}</button>
    </div>}
  </div>;
}
