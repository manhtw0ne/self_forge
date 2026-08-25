import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useEffect, useState } from 'react';
import api from '../api/client';

// Premium-only routes that show a lock icon for free users
const PREMIUM_ROUTES = ['/review'];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [level, setLevel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.get('/rewards/progress').then(r => setLevel(r.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const links = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/habits', icon: '🎯', label: 'Thói quen' },
    { to: '/journal', icon: '📝', label: 'Nhật ký' },
    { to: '/stats', icon: '📈', label: 'Thống kê' },
    { to: '/challenges', icon: '⚡', label: 'Thử thách' },
    { to: '/rewards', icon: '🏆', label: 'Thành tựu' },
    { to: '/pomodoro', icon: '⏱', label: 'Pomodoro' },
    { to: '/review', icon: '📋', label: 'Review tuần' },
    { to: '/goals', icon: '🎯', label: 'Mục tiêu' },
    { to: '/reminders', icon: '🔔', label: 'Nhắc nhở' },
    { to: '/profile', icon: '👤', label: 'Cá nhân' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>⚔️ SelfForge</h1>
          <p>Kỷ luật bản thân</p>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">{l.icon}</span>
              {l.label}
              {!isPremium && PREMIUM_ROUTES.includes(l.to) && (
                <span className="nav-premium-badge" title="Premium">🔒</span>
              )}
            </NavLink>
          ))}

          {/* Premium upgrade link — only for free users */}
          {!isPremium && (
            <NavLink
              to="/premium"
              className={({ isActive }) => `nav-link nav-link-upgrade ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">⭐</span>
              Nâng cấp Premium
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}>
            <span className="theme-toggle-track">
              <span className={`theme-toggle-thumb ${theme === 'light' ? 'light' : ''}`}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Tối' : 'Sáng'}</span>
          </button>

          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {isPremium && <span className="premium-crown" title="Premium">👑</span>}
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.displayName || 'User'}
                {isPremium && <span className="premium-badge-inline">PRO</span>}
              </div>
              <div className="sidebar-user-level">
                Level {level?.level || 1} · {level?.totalXp || 0} XP
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }} onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main-content fade-in">
        {children}
      </main>
    </div>
  );
}
