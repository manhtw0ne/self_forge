import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';

const quotes = [
  '"Kỷ luật là cầu nối giữa mục tiêu và thành tựu." — Jim Rohn',
  '"Thành công không phải ngẫu nhiên, mà là kỷ luật mỗi ngày."',
  '"Bạn không cần phải hoàn hảo, chỉ cần kiên trì."',
  '"Mỗi bước nhỏ đều đưa bạn gần hơn tới phiên bản tốt nhất."',
  '"Hôm nay khó khăn, ngày mai dễ hơn — nếu bạn không bỏ cuộc."',
  '"Kỷ luật bản thân là hình thức tự yêu thương cao nhất."',
  '"Không ai có thể quay ngược thời gian, nhưng ai cũng có thể bắt đầu hôm nay."',
  '"Thói quen tốt hôm nay là phần thưởng của ngày mai."',
];

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Rất tệ' },
  { score: 2, emoji: '😟', label: 'Tệ' },
  { score: 3, emoji: '😐', label: 'Bình thường' },
  { score: 4, emoji: '😊', label: 'Tốt' },
  { score: 5, emoji: '🤩', label: 'Tuyệt vời' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function computeCombo(habits) {
  if (!habits || habits.length === 0) return { multiplier: 1, label: null, allDone: false };
  const completedCount = habits.filter(h => h.todayStatus === 'COMPLETED').length;
  const allDone = completedCount === habits.length && habits.length > 0;
  // Check if all habits have todayStatus (meaning all were checked in some way)
  const allChecked = habits.every(h => h.todayStatus);
  
  if (allDone) {
    return { multiplier: 1.5, label: 'x1.5', css: 'x15', allDone: true, 
      text: `🔥 Combo! Hoàn thành tất cả ${habits.length} thói quen → x1.5 điểm!` };
  }
  
  const remaining = habits.length - completedCount;
  if (remaining > 0 && remaining <= 2 && completedCount > 0) {
    return { multiplier: 1, label: null, allDone: false,
      text: `💪 Còn ${remaining} thói quen nữa để đạt Combo x1.5!` };
  }
  
  return { multiplier: 1, label: null, allDone: false };
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(null);
  const [freezeInfo, setFreezeInfo] = useState(null);
  const { user } = useAuth();
  const toast = useToast();
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/today'),
      api.get('/mood').catch(() => ({ data: null })),
      api.get('/streak-freeze/remaining').catch(() => ({ data: { remaining: 2, max: 2 } })),
    ]).then(([d, m, f]) => {
      setData(d.data);
      setMood(m.data);
      setFreezeInfo(f.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><p>Không thể tải dữ liệu</p></div>;

  const combo = computeCombo(data.habits);

  const checkIn = async (habitId, status) => {
    try {
      await api.post('/check-ins', { habitId, status });
      const res = await api.get('/dashboard/today');
      setData(res.data);
      const msgs = {
        COMPLETED: '✅ Hoàn thành! Tuyệt vời!',
        FAILED: '😔 Thất bại — nhưng đừng bỏ cuộc!',
        SKIPPED: '⏭️ Đã bỏ qua',
      };
      toast.success(msgs[status] || 'Đã cập nhật!');
      
      // Check combo after update
      const newCombo = computeCombo(res.data.habits);
      if (newCombo.allDone && !combo.allDone) {
        setTimeout(() => toast.success('🎉 COMBO x1.5! Hoàn thành tất cả thói quen!'), 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleMood = async (score, emoji) => {
    try {
      const res = await api.post('/mood', { score, emoji });
      setMood(res.data);
      toast.success(`Tâm trạng: ${emoji} — đã ghi nhận!`);
    } catch {
      toast.error('Không thể lưu tâm trạng');
    }
  };

  const handleFreeze = async (habitId) => {
    try {
      await api.post('/streak-freeze', { habitId });
      toast.success('❄️ Đã freeze streak!');
      const [d, f] = await Promise.all([
        api.get('/dashboard/today'),
        api.get('/streak-freeze/remaining'),
      ]);
      setData(d.data);
      setFreezeInfo(f.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || 'Không thể freeze');
    }
  };

  return (
    <div className="fade-in">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-title">
          {getGreeting()}, {user?.displayName || 'bạn'}! 👋
        </div>
        <div className="greeting-quote">{quote}</div>
        <div className="greeting-date">📅 {formatDate(data.date)}</div>
      </div>

      {/* Mood Selector */}
      <div className="mood-widget glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hôm nay bạn cảm thấy thế nào?</span>
          {mood && <span className="badge badge-info">{MOOD_OPTIONS.find(m => m.score === mood.score)?.emoji} Đã ghi</span>}
        </div>
        <div className="mood-options">
          {MOOD_OPTIONS.map(m => (
            <button key={m.score}
              className={`mood-btn ${mood?.score === m.score ? 'active' : ''}`}
              onClick={() => handleMood(m.score, m.emoji)}
              title={m.label}>
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Combo Info */}
      {combo.text && (
        <div className={combo.allDone ? 'combo-info' : 'combo-info'} style={combo.allDone ? { background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' } : {}}>
          {combo.allDone && <span className={`combo-badge ${combo.css}`}>{combo.label}</span>}
          <span>{combo.text}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/habits" className="quick-action-btn">🎯 Quản lý thói quen</Link>
        <Link to="/journal" className="quick-action-btn">📝 Viết nhật ký</Link>
        <Link to="/pomodoro" className="quick-action-btn">⏱ Pomodoro</Link>
        <Link to="/stats" className="quick-action-btn">📈 Xem thống kê</Link>
        <Link to="/challenges" className="quick-action-btn">⚡ Thử thách</Link>
      </div>

      {/* Stats Overview */}
      <div className="card-grid card-grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card slide-in">
          <div className="stat-label">Điểm hôm nay</div>
          <div className="stat-value">
            {data.todayScore}
            {combo.allDone && <span style={{ fontSize: '0.6em', color: 'var(--success)' }}> ×1.5</span>}
          </div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-label">Điểm tuần này</div>
          <div className="stat-value">{data.weekScore}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-label">Tỷ lệ hoàn thành</div>
          <div className="stat-value">{Math.round(data.weekCompletionRate * 100)}%</div>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="progress-fill" style={{ width: `${data.weekCompletionRate * 100}%` }} />
          </div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="stat-label">Freeze còn lại</div>
          <div className="stat-value">❄️ {freezeInfo?.remaining ?? '?'}/{freezeInfo?.max ?? 2}</div>
          <div className="stat-sub">tháng này</div>
        </div>
      </div>

      {/* Today's Habits */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 Tiến độ thói quen hôm nay</span>
          {data.habits.length > 0 && (
            <span className="badge badge-info">
              {data.habits.filter(h => h.todayStatus === 'COMPLETED').length}/{data.habits.length} xong
            </span>
          )}
        </div>
        {data.habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>Chưa có thói quen nào. Hãy tạo thói quen đầu tiên!</p>
            <Link to="/habits" className="btn btn-primary">+ Tạo thói quen</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.habits.map((h, i) => (
              <div key={h.habitId} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="habit-info">
                  <div className="habit-name">{h.name}</div>
                  <div className="habit-meta">
                    <span className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                      {h.difficulty === 'HARD' ? 'Khó' : h.difficulty === 'MEDIUM' ? 'Trung bình' : 'Dễ'}
                    </span>
                    <span>{h.completedThisWeek}/{h.targetPerWeek} tuần này</span>
                    {h.currentStreak > 0 && (
                      <span className="streak-indicator">🔥 {h.currentStreak} ngày</span>
                    )}
                  </div>
                </div>
                <div className="habit-actions">
                  {h.todayStatus === 'COMPLETED' ? (
                    <span className="badge badge-success">✓ Đã xong</span>
                  ) : h.todayStatus === 'FAILED' ? (
                    <span className="badge badge-danger">✗ Thất bại</span>
                  ) : h.todayStatus === 'SKIPPED' ? (
                    <span className="badge badge-warning">⏭ Bỏ qua</span>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => checkIn(h.habitId, 'COMPLETED')} title="Hoàn thành">✓</button>
                      <button className="btn btn-warning btn-sm" onClick={() => checkIn(h.habitId, 'SKIPPED')} title="Bỏ qua">⏭</button>
                      <button className="btn btn-danger btn-sm" onClick={() => checkIn(h.habitId, 'FAILED')} title="Thất bại">✗</button>
                      {freezeInfo?.remaining > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleFreeze(h.habitId)} title="Freeze streak">❄️</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
