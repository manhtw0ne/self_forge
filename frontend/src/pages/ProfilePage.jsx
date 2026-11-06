import MotionSettings from '../components/MotionSettings';
import PasswordInput from '../components/PasswordInput';
import DeleteAccount from '../components/DeleteAccount';
import { useLanguage } from '../context/useLanguage';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';
import SessionManager from '../components/SessionManager';
import SecurityActivity from '../components/SecurityActivity';
import EmailChange from '../components/EmailChange';
import EmailVerification from '../components/EmailVerification';
import TimezoneSelector from '../components/TimezoneSelector';
import OAuthLinkSettings from '../components/OAuthLinkSettings';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasPasswordConfirmationMismatch } from '../utils/passwordConfirmation';

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    motto: user?.motto || '',
    timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
  });
  const [savedForm, setSavedForm] = useState(form);
  const [profileConflict, setProfileConflict] = useState(false);
  const [latestProfile, setLatestProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const profileDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const passwordMismatch = hasPasswordConfirmationMismatch(pwForm.newPassword, pwForm.confirmPassword);
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
    const query = new URLSearchParams(location.search);
    if (query.get('oauth_linked') !== '1') return;
    query.delete('oauth_linked');
    query.delete('next');
    toast.success(t(language === 'en' ? 'Social sign-in was linked to this account.' : 'Đã liên kết đăng nhập mạng xã hội với tài khoản này.'));
    navigate({ pathname: location.pathname, search: query.toString() ? `?${query}` : '' }, { replace: true });
  }, [language, location.pathname, location.search, navigate, t, toast]);
  const handleEmailVerified = useCallback(async () => {
    await refreshUser();
    toast.success(t('Email tài khoản đã được xác minh.'));
  }, [refreshUser, toast, t]);

  useEffect(() => {
    let active = true;
    setStatsError(false);
    api.get('/rewards/progress').then(r => { if (active) setStats(r.data); }).catch(() => { if (active) setStatsError(true); });
    return () => { active = false; };
  }, [statsAttempt]);

  useEffect(() => {
    if (!profileDirty && !Object.values(pwForm).some(Boolean)) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [profileDirty, pwForm]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileBusy.current || deletingAccount || profileConflict) return;
    if (!form.displayName.trim()) { toast.error(t('Tên hiển thị không được để trống.')); return; }
    profileBusy.current = true; setSavingProfile(true);
    try {
      const { data } = await api.patch('/profile', { ...form, displayName: form.displayName.trim(), expected: savedForm });
      const saved = { displayName: data.displayName, motto: data.motto || '', timezone: data.timezone };
      setForm(saved); setSavedForm(saved);
      await refreshUser().catch(() => toast.info(t('Thông tin đã lưu nhưng chưa tải lại được hồ sơ.')));
      toast.success(t("Đã lưu thông tin! ✓"));
    } catch (err) {
      if (err.response?.status === 409) { setProfileConflict(true); setLatestProfile(null); }
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { profileBusy.current = false; setSavingProfile(false); }
  };

  const loadLatestProfile = async () => {
    if (profileBusy.current || deletingAccount) return;
    profileBusy.current = true; setCheckingProfile(true);
    try {
      const { data } = await api.get('/profile');
      setLatestProfile({ displayName: data.displayName, motto: data.motto || '', timezone: data.timezone || 'Asia/Ho_Chi_Minh' });
      await refreshUser().catch(() => toast.info(t('Thông tin đã lưu nhưng chưa tải lại được hồ sơ.')));
    } catch { toast.error(t('Chưa tải được hồ sơ mới. Nội dung đang nhập vẫn được giữ.')); }
    finally { profileBusy.current = false; setCheckingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordBusy.current || deletingAccount) return;
    if (passwordMismatch) {
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
    if (exportBusy.current || deletingAccount) return;
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

          <form onSubmit={handleSaveProfile}><fieldset disabled={savingProfile || deletingAccount || checkingProfile} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">{t("Tên hiển thị")}</label>
              <input id="profile-name" autoComplete="nickname" required maxLength={100} className="form-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-motto">{t("Khẩu hiệu")}</label>
              <input id="profile-motto" maxLength={255} className="form-input" value={form.motto} onChange={e => setForm({ ...form, motto: e.target.value })} placeholder={t("VD: Kỷ luật là tự do")} />
            </div>
            <TimezoneSelector value={form.timezone} onChange={timezone => setForm({ ...form, timezone })} disabled={savingProfile || deletingAccount} />
            {profileConflict && <section role="alert" style={{ margin: '1rem 0' }}>
              <p>{t('Hồ sơ trên máy chủ đã thay đổi. Nội dung đang nhập vẫn được giữ.')}</p>
              <button type="button" className="btn btn-secondary" disabled={checkingProfile} onClick={loadLatestProfile}>{t(checkingProfile ? 'Đang tải…' : 'Xem hồ sơ mới')}</button>
              {latestProfile && <div className="card" style={{ marginTop: '1rem' }}>
                <p><strong>{t('Tên hiển thị')}:</strong> {latestProfile.displayName}</p>
                <p><strong>{t('Múi giờ')}:</strong> {latestProfile.timezone}</p>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><strong>{t('Khẩu hiệu')}:</strong> {latestProfile.motto || '—'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setForm(latestProfile); setSavedForm(latestProfile); setProfileConflict(false); setLatestProfile(null); }}>{t('Dùng hồ sơ mới')}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setSavedForm(latestProfile); setProfileConflict(false); setLatestProfile(null); }}>{t('Giữ nội dung đang nhập để lưu tiếp')}</button>
                </div>
              </div>}
            </section>}
            {profileDirty && <p role="status">{t('Bạn có thay đổi chưa lưu.')}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={!profileDirty || profileConflict || checkingProfile}>{t(savingProfile ? 'Đang lưu...' : 'Lưu thay đổi')}</button>
              {profileDirty && <button type="button" className="btn btn-secondary" onClick={() => { if (window.confirm(t('Bỏ thay đổi hồ sơ chưa lưu?'))) setForm(savedForm); }}>{t('Bỏ thay đổi')}</button>}
            </div>
          </fieldset></form>
        </div>

        {/* Password + Export Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{t("Đổi mật khẩu")}</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-old-password">{t("Mật khẩu hiện tại")}</label>
                <PasswordInput id="profile-old-password" type="password" className="form-input" autoComplete="current-password" maxLength={128} disabled={savingPassword || deletingAccount} value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-new-password">{t("Mật khẩu mới")}</label>
                <PasswordInput id="profile-new-password" type="password" className="form-input" autoComplete="new-password" minLength={10} maxLength={128} disabled={savingPassword || deletingAccount} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">{t("Nhập lại mật khẩu mới")}</label>
                <PasswordInput id="confirm-password" type="password" className="form-input" autoComplete="new-password"
                  minLength={10} maxLength={128} disabled={savingPassword || deletingAccount}
                  value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required
                  aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? 'profile-confirm-password-error' : undefined} />
                {passwordMismatch && <p id="profile-confirm-password-error" role="status" className="password-confirmation-error">{t('Mật khẩu xác nhận không khớp.')}</p>}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'en' ? 'Use 10–128 characters and do not use your email as the password. A successful change signs out every device.' : 'Mật khẩu mới từ 10 đến 128 ký tự; không dùng email làm mật khẩu. Đổi thành công sẽ đăng xuất trên tất cả thiết bị.'}</p>
              <button type="submit" className="btn btn-primary" disabled={savingPassword || deletingAccount || passwordMismatch}>{t(savingPassword ? 'Đang đổi…' : 'Đổi mật khẩu')}</button>
            </form>
          </div>

          <EmailVerification email={user?.email || ''} verified={user?.emailVerified === true} disabled={deletingAccount || savingPassword} onVerified={handleEmailVerified} />

          <EmailChange currentEmail={user?.email || ''} disabled={deletingAccount || savingPassword} onChanged={async () => {
            toast.success(t('Đã đổi email. Vui lòng đăng nhập lại bằng email mới.'));
            await logout();
          }} />

          <OAuthLinkSettings disabled={deletingAccount || savingPassword} nativePlatform={Capacitor.isNativePlatform()} />

          <div className="card">
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{t("📤 Xuất dữ liệu")}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t("Tải về file CSV chứa tất cả thói quen, check-in (90 ngày), và nhật ký của bạn.")}
            </p>
            <button className="btn btn-secondary" onClick={() => handleExport(false)} disabled={exporting || deletingAccount} style={{ width: '100%' }}>
              {t(exporting ? '⏳ Đang xuất...' : '📥 Tải về CSV')}
            </button>
          </div>
        </div>
      </div>
      <MotionSettings/>
      <section id="personal-data-export" className="card" style={{ marginTop: '1.5rem' }}>
        <h3>{t('Bản sao dữ liệu cá nhân')}</h3>
        <p>{t('Tải dữ liệu tài khoản và toàn bộ lịch sử hoạt động dưới dạng JSON. Miễn phí cho mọi tài khoản; file chứa nội dung riêng tư của bạn.')}</p>
        <button className="btn btn-secondary" disabled={exporting || deletingAccount} onClick={() => handleExport(true)}>{t('Tải bản sao JSON')}</button>
      </section>
      <SecurityActivity disabled={deletingAccount}/>
      <div inert={deletingAccount}><SessionManager /></div>
      <DeleteAccount onBusyChange={setDeletingAccount} disabled={savingProfile || checkingProfile || savingPassword || exporting} />
    </div>
  );
}
