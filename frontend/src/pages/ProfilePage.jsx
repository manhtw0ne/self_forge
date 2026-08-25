import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    motto: user?.motto || '',
    timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
  });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/rewards/progress').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/profile', form);
      await refreshUser();
      toast.success('Đã lưu thông tin! ✓');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/profile/password', pwForm);
      setPwForm({ oldPassword: '', newPassword: '' });
      toast.success('Đã đổi mật khẩu thành công! 🔒');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Mật khẩu cũ không đúng');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'selfforge_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('📤 Đã tải xuống file CSV!');
    } catch {
      toast.error('Không thể xuất dữ liệu');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>👤 Cá nhân</h1>
        <p>Quản lý thông tin và cài đặt</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="card-grid card-grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card slide-in">
            <div className="stat-label">Cấp độ</div>
            <div className="stat-value">Lv.{stats.level}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">Tổng XP</div>
            <div className="stat-value">{stats.totalXp}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">Tiến độ level</div>
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
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Thông tin cá nhân</h3>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="sidebar-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 0.75rem' }}>
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ fontWeight: 600 }}>{user?.displayName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            {user?.motto && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem' }}>"{user.motto}"</div>}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input className="form-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Khẩu hiệu</label>
              <input className="form-input" value={form.motto} onChange={e => setForm({ ...form, motto: e.target.value })} placeholder="VD: Kỷ luật là tự do" />
            </div>
            <div className="form-group">
              <label className="form-label">Múi giờ</label>
              <select className="form-select" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
          </form>
        </div>

        {/* Password + Export Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Đổi mật khẩu</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <input type="password" className="form-input" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input type="password" className="form-input" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary">Đổi mật khẩu</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>📤 Xuất dữ liệu</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Tải về file CSV chứa tất cả thói quen, check-in (90 ngày), và nhật ký của bạn.
            </p>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting} style={{ width: '100%' }}>
              {exporting ? '⏳ Đang xuất...' : '📥 Tải về CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
