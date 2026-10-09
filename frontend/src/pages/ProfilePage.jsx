import { useLanguage } from '../context/useLanguage';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';
import SessionManager from '../components/SessionManager';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    motto: user?.motto || '',
    timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
  });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const passwordBusy = useRef(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [stats, setStats] = useState(null);
  const profileBusy = useRef(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [statsAttempt, setStatsAttempt] = useState(0);
  const exportBusy = useRef(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setStatsError(false);
    api.get('/rewards/progress').then(r => setStats(r.data)).catch(() => setStatsError(true));
  }, [statsAttempt]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileBusy.current) return;
    profileBusy.current = true; setSavingProfile(true);
    try {
      await api.patch('/profile', form);
      await refreshUser().catch(() => toast.info(t('Thông tin đã lưu nhưng chưa tải lại được hồ sơ.')));
      toast.success(t("Đã lưu thông tin! ✓"));
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { profileBusy.current = false; setSavingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordBusy.current) return;
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error(t('Mật khẩu xác nhận không khớp.'));
      return;
    }
    passwordBusy.current = true;
    setSavingPassword(true);
    try {
      await api.patch('/profile/password', pwForm);
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t("Đã đổi mật khẩu. Vui lòng đăng nhập lại."));
      await logout();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(t(detail === 'Old password is incorrect' ? 'Mật khẩu hiện tại không đúng.' : (detail || 'Chưa xác nhận được kết quả. Nếu mất kết nối, hãy thử đăng nhập bằng mật khẩu mới.')));
    } finally {
      passwordBusy.current = false;
      setSavingPassword(false);
    }
  };
  const handleExport = async (personal = false) => {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setExporting(true);
    try {
      const res = await api.get(personal ? '/profile/data' : '/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', personal ? 'selfforge-personal-data.json' : 'selfforge_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t(personal ? "Đã tải bản sao dữ liệu." : "📤 Đã tải xuống file CSV!"));
    } catch {
      toast.error(t("Không thể xuất dữ liệu"));
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("👤 Cá nhân")}</h1>
        <p>{t("Quản lý thông tin và cài đặt")}</p>
      </div>

      {statsError && <div role="status"><p>{t('Không thể tải dữ liệu.')}</p><button className="btn btn-secondary" onClick={() => setStatsAttempt(a => a + 1)}>{t('Thử lại')}</button></div>}
      {/* Stats Summary */}
      {stats && (
        <div className="card-grid card-grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card slide-in">
            <div className="stat-label">{t("Cấp độ")}</div>
            <div className="stat-value">Lv.{stats.level}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">{t("Tổng XP")}</div>
            <div className="stat-value">{stats.totalXp}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">{t("Tiến độ level")}</div>
            <div className="stat-value">{Math.round(stats.levelProgress * 100)}%</div>
            <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
              <div className="progress-fill" style={{ width: `${stats.levelProgress * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="card-grid card-grid-2">
        {/* Profile Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{t("Thông tin cá nhân")}</h3>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="sidebar-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 0.75rem' }}>
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ fontWeight: 600 }}>{user?.displayName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            {user?.motto && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem' }}>"{user.motto}"</div>}
          </div>

          <form onSubmit={handleSaveProfile}><fieldset disabled={savingProfile} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="form-group">
              <label className="form-label">{t("Tên hiển thị")}</label>
              <input className="form-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t("Khẩu hiệu")}</label>
              <input className="form-input" value={form.motto} onChange={e => setForm({ ...form, motto: e.target.value })} placeholder={t("VD: Kỷ luật là tự do")} />
            </div>
            <div className="form-group">
              <label className="form-label">{t("Múi giờ")}</label>
              <select className="form-select" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">{t("Lưu thay đổi")}</button>
          </fieldset></form>
        </div>

        {/* Password + Export Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{t("Đổi mật khẩu")}</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">{t("Mật khẩu hiện tại")}</label>
                <input type="password" className="form-input" autoComplete="current-password" maxLength={128} disabled={savingPassword} value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Mật khẩu mới")}</label>
                <input type="password" className="form-input" autoComplete="new-password" minLength={8} maxLength={128} disabled={savingPassword} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">{t("Nhập lại mật khẩu mới")}</label>
                <input id="confirm-password" type="password" className="form-input" autoComplete="new-password"
                  minLength={8} maxLength={128} disabled={savingPassword}
                  value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t("Mật khẩu mới từ 8 đến 128 ký tự. Đổi thành công sẽ đăng xuất trên tất cả thiết bị.")}</p>
              <button type="submit" className="btn btn-primary" disabled={savingPassword}>{t(savingPassword ? 'Đang đổi…' : 'Đổi mật khẩu')}</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{t("📤 Xuất dữ liệu")}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t("Tải về file CSV chứa tất cả thói quen, check-in (90 ngày), và nhật ký của bạn.")}
            </p>
            <button className="btn btn-secondary" onClick={() => handleExport(false)} disabled={exporting} style={{ width: '100%' }}>
              {t(exporting ? '⏳ Đang xuất...' : '📥 Tải về CSV')}
            </button>
          </div>
        </div>
      </div>
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h3>{t('Bản sao dữ liệu cá nhân')}</h3>
        <p>{t('Tải dữ liệu tài khoản và toàn bộ lịch sử hoạt động dưới dạng JSON. Miễn phí cho mọi tài khoản; file chứa nội dung riêng tư của bạn.')}</p>
        <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport(true)}>{t('Tải bản sao JSON')}</button>
      </section>
      <SessionManager />
    </div>
  );
}
