import { useLanguage } from './context/useLanguage';
import PageErrorBoundary from './components/PageErrorBoundary';
import { LanguageProvider } from './context/LanguageProvider';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { PremiumProvider } from './context/PremiumContext';
import Toast from './components/Toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HabitsPage from './pages/HabitsPage';
import JournalPage from './pages/JournalPage';
import StatsPage from './pages/StatsPage';
import ChallengesPage from './pages/ChallengesPage';
import RewardsPage from './pages/RewardsPage';
import RemindersPage from './pages/RemindersPage';
import ProfilePage from './pages/ProfilePage';
import PomodoroPage from './pages/PomodoroPage';
import WeeklyReviewPage from './pages/WeeklyReviewPage';
import GoalsPage from './pages/GoalsPage';
import PremiumPage from './pages/PremiumPage';

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
  const { user, loading, sessionError, storageUnavailable } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (sessionError || storageUnavailable) return <SessionRecovery />;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading, sessionError, storageUnavailable } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (sessionError || storageUnavailable) return <SessionRecovery />;
  if (user) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <LanguageProvider><ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <PremiumProvider>
              <Toast />
              <PageErrorBoundary><Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/habits" element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
                <Route path="/journal" element={<PrivateRoute><JournalPage /></PrivateRoute>} />
                <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
                <Route path="/challenges" element={<PrivateRoute><ChallengesPage /></PrivateRoute>} />
                <Route path="/rewards" element={<PrivateRoute><RewardsPage /></PrivateRoute>} />
                <Route path="/pomodoro" element={<PrivateRoute><PomodoroPage /></PrivateRoute>} />
                <Route path="/review" element={<PrivateRoute><WeeklyReviewPage /></PrivateRoute>} />
                <Route path="/goals" element={<PrivateRoute><GoalsPage /></PrivateRoute>} />
                <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/premium" element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes></PageErrorBoundary>
            </PremiumProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider></LanguageProvider>
  );
}
