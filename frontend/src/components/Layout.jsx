import QuickSearch from './QuickSearch';
import AppUpdate from './AppUpdate';
import NetworkStatus from './NetworkStatus';
import InstallApp from './InstallApp';
import { observeProgress, PROGRESS_CHANGED } from '../utils/progressSync';
const brandLogo = '/icons/icon-192.png';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/useLanguage';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { usePremium } from '../context/usePremium';
import { useEffect, useState, useRef } from 'react';
import api from '../api/client';

// Keep this list for future paid routes. Weekly review is intentionally open
// during the public beta: Premium is not yet purchasable, so a core reflection
// flow must not lead people to an unavailable upgrade.
const PREMIUM_ROUTES = [];

export default function Layout({ children }) {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [level, setLevel] = useState(null);
  const [progressError, setProgressError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const logoutBusy = useRef(false);

  useEffect(() => {
    setLevel(null); setProgressError(false);
    return observeProgress({
      target: window, document,
      load: () => api.get('/rewards/progress'),
      publish: response => { setLevel(response.data); setProgressError(false); },
      fail: () => { setLevel(null); setProgressError(true); },
    });
  }, [user?.id]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => { setMobile(media.matches); setSidebarOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobile || !sidebarOpen) return;
    const sidebar = sidebarRef.current;
    const opener = menuButtonRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => [...sidebar.querySelectorAll('a[href], button, select, input, [tabindex]')]
      .filter(node => !node.matches(':disabled') && node.tabIndex >= 0 && node.getClientRects().length > 0);
    controls()[0]?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); setSidebarOpen(false); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      if (opener?.isConnected && window.matchMedia('(max-width: 768px)').matches) opener.focus();
    };
  }, [mobile, sidebarOpen]);

  const handleLogout = async () => {
    if (logoutBusy.current) return;
    logoutBusy.current = true; setSigningOut(true);
    try { await logout(); navigate('/login'); }
    finally { logoutBusy.current = false; setSigningOut(false); }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const links = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/habits', icon: '🎯', label: t('Thói quen') },
    { to: '/check-in-history', icon: '📅', label: t('Lịch sử check-in') },
    { to: '/journal', icon: '📝', label: t('Nhật ký') },
    { to: '/stats', icon: '📈', label: t('Thống kê') },
    { to: '/challenges', icon: '⚡', label: t('Thử thách') },
    { to: '/rewards', icon: '🏆', label: t('Thành tựu') },
    { to: '/pomodoro', icon: '⏱', label: 'Pomodoro' },
    { to: '/review', icon: '📋', label: t('Review tuần') },
    { to: '/coach', icon: '✦', label: 'AI Coach' },
    { to: '/goals', icon: '🎯', label: t('Mục tiêu') },
    { to: '/reminders', icon: '🔔', label: t('Nhắc nhở') },
    { to: '/companion', icon: '🐾', label: t('Bạn đồng hành') },
    { to: '/help', icon: '?', label: t('Trợ giúp') },
    { to: '/profile', icon: '👤', label: t('Cá nhân') },
  ];

  return (
    <div className="app-layout">
      <a className="skip-navigation-link" href="#main-content">{language === 'en' ? 'Skip to main content' : 'Bỏ qua điều hướng đến nội dung chính'}</a>
      {/* Mobile hamburger */}
      <button ref={menuButtonRef} aria-expanded={sidebarOpen} aria-controls="app-sidebar" inert={mobile && sidebarOpen} className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label={t('Mở menu')}>
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside id="app-sidebar" ref={sidebarRef} inert={mobile && !sidebarOpen} role={mobile && sidebarOpen ? 'dialog' : undefined} aria-modal={mobile && sidebarOpen ? true : undefined} aria-label={t('Điều hướng chính')} className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="btn btn-secondary sidebar-close" onClick={closeSidebar}>{t('Đóng menu')}</button>
        <div className="sidebar-brand">
          <h1 className="brand-heading"><img src={brandLogo} className="brand-logo" alt="" width="48" height="48" />SelfForge</h1>
          <p>{t('Kỷ luật bản thân')}</p>
        </div>
        <nav className="sidebar-nav" aria-label={t('Điều hướng chính')}>
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
              {t('Nâng cấp Premium')}
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer"><InstallApp /><LanguageSelector />
          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? t('Chuyển sang sáng') : t('Chuyển sang tối')}>
            <span className="theme-toggle-track">
              <span className={`theme-toggle-thumb ${theme === 'light' ? 'light' : ''}`}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </span>
            <span className="theme-toggle-label">{theme === 'dark' ? t('Tối') : t('Sáng')}</span>
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
                {t('Cấp {level} · {xp} XP', { level: level?.level ?? '—', xp: level?.totalXp ?? '—' })}
              </div>
            </div>
          </div>
          {progressError && <div role="status"><p>{t('Chưa tải được XP hiện tại.')}</p><button className="btn btn-secondary btn-sm" onClick={() => {
            setProgressError(false);
            window.dispatchEvent(new Event(PROGRESS_CHANGED));
          }}>{t('Thử lại')}</button></div>}
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }} disabled={signingOut} onClick={handleLogout}>
            {t('Đăng xuất')}
          </button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} inert={mobile && sidebarOpen} className="main-content fade-in">
        <QuickSearch key={user?.id} disabled={signingOut||(mobile&&sidebarOpen)}/>
        <NetworkStatus />
        <AppUpdate />
        {children}
      </main>
    </div>
  );
}
