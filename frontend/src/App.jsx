import { safeReturnPath } from './utils/returnPath';
import AppInstallProvider from './context/AppInstallProvider';
import { lazy, Suspense, useEffect } from 'react';
import { useLanguage } from './context/useLanguage';
import PageErrorBoundary from './components/PageErrorBoundary';
import { LanguageProvider } from './context/LanguageProvider';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { PremiumProvider } from './context/PremiumContext';
import Toast from './components/Toast';
import Layout from './components/Layout';
import NativeReminderNavigation from './components/NativeReminderNavigation';

const CheckInHistoryPage = lazy(() => import('./pages/CheckInHistoryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PomodoroPage = lazy(() => import('./pages/PomodoroPage'));
const WeeklyReviewPage = lazy(() => import('./pages/WeeklyReviewPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const PublicInformationPage = lazy(() => import('./pages/PublicInformationPage'));
const EmailChangeRecoveryPage = lazy(() => import('./pages/EmailChangeRecoveryPage'));
const CompanionPage = lazy(() => import('./pages/CompanionPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

function PageLoading() {
  const { t } = useLanguage();
  return <div className="loading-spinner" role="status"><div className="spinner" aria-hidden="true" /><span>{t('Đang tải trang…')}</span></div>;
}

function HashTargetFocus() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    let timeout;
    let attempts = 0;
    const scroll = () => {
      let id;
      try { id = decodeURIComponent(hash.slice(1)); }
      catch { return; }
      const target = id ? document.getElementById(id) : null;
      if (target) {
        target.scrollIntoView({ block: 'start' });
        // Deep links must also move the reading cursor for keyboard and
        // screen-reader users. A programmatic tabindex keeps the target out
        // of the normal tab order while making the destination explicit.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); }
        catch { target.focus(); }
      } else if (attempts++ < 20) {
        // Dashboard panels load after the route shell. Keep this short retry
        // window so a deliberate in-app link still works on a slower network.
        timeout = window.setTimeout(scroll, 100);
      }
    };
    timeout = window.setTimeout(scroll, 0);
    return () => { if (timeout) window.clearTimeout(timeout); };
  }, [pathname, hash]);

  return null;
}

function RouteContent({ children }) {
  const { pathname } = useLocation();
  return <><HashTargetFocus /><PageErrorBoundary key={pathname}><Suspense fallback={<PageLoading />}>{children}</Suspense></PageErrorBoundary></>;
}

function SessionRecovery() {
  const { retrySession, storageUnavailable } = useAuth();
  const { t } = useLanguage();
  return <main className="auth-page"><section className="auth-card" role="alert">
    <h1>{t(storageUnavailable ? 'Trình duyệt đang chặn lưu trữ' : 'Chưa kết nối được tài khoản')}</h1>
    <p style={{ margin: '1rem 0' }}>{t(storageUnavailable ? 'Hãy cho phép trang web lưu dữ liệu trong cài đặt trình duyệt, rồi thử lại.' : 'Phiên đăng nhập vẫn được giữ. Kiểm tra kết nối và thử lại.')}</p>
    <button type="button" className="btn btn-primary" onClick={retrySession}>{t('Thử lại')}</button>
  </section></main>;
}

function PrivateRoute({ children }) {
  const location = useLocation();
  const { user, loading, sessionError, storageUnavailable } = useAuth();
  if (loading) return <PageLoading />;
  if (sessionError || storageUnavailable) return <SessionRecovery />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  return <Layout><RouteContent>{children}</RouteContent></Layout>;
}

function PublicRoute({ children }) {
  const location = useLocation();
  const { user, loading, sessionError, storageUnavailable } = useAuth();
  if (loading) return <PageLoading />;
  if (sessionError || storageUnavailable) return <SessionRecovery />;
  if (user) return <Navigate to={safeReturnPath(location.state?.from || new URLSearchParams(location.search).get('next'))} replace />;
  return <RouteContent>{children}</RouteContent>;
}

function HomeRoute() {
  const { user, loading, sessionError, storageUnavailable } = useAuth();
  if (loading) return <PageLoading />;
  if (sessionError || storageUnavailable) return <SessionRecovery />;
  if (!user) return <RouteContent><LandingPage /></RouteContent>;
  return <Layout><RouteContent><DashboardPage /></RouteContent></Layout>;
}

export default function App() {
  return (
    <ThemeProvider><AppInstallProvider>
      <BrowserRouter>
        <NativeReminderNavigation />
        <ToastProvider>
          <AuthProvider>
            <LanguageProvider><PremiumProvider>
              <Toast />
              <PageErrorBoundary><Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/privacy" element={<RouteContent><PublicInformationPage kind="privacy" /></RouteContent>} />
                <Route path="/terms" element={<RouteContent><PublicInformationPage kind="terms" /></RouteContent>} />
                <Route path="/email-change-recovery" element={<RouteContent><EmailChangeRecoveryPage /></RouteContent>} />
                <Route path="/" element={<HomeRoute />} />
                <Route path="/habits" element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
                <Route path="/journal" element={<PrivateRoute><JournalPage /></PrivateRoute>} />
                <Route path="/check-in-history" element={<PrivateRoute><CheckInHistoryPage /></PrivateRoute>} />
                <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
                <Route path="/challenges" element={<PrivateRoute><ChallengesPage /></PrivateRoute>} />
                <Route path="/rewards" element={<PrivateRoute><RewardsPage /></PrivateRoute>} />
                <Route path="/pomodoro" element={<PrivateRoute><PomodoroPage /></PrivateRoute>} />
                <Route path="/review" element={<PrivateRoute><WeeklyReviewPage /></PrivateRoute>} />
                <Route path="/goals" element={<PrivateRoute><GoalsPage /></PrivateRoute>} />
                <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
                <Route path="/companion" element={<PrivateRoute><CompanionPage /></PrivateRoute>} />
                <Route path="/coach" element={<PrivateRoute><CoachPage /></PrivateRoute>} />
                <Route path="/help" element={<PrivateRoute><HelpPage /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/premium" element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes></PageErrorBoundary>
            </PremiumProvider></LanguageProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </AppInstallProvider></ThemeProvider>
  );
}
