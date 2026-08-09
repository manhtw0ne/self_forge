import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, displayName, password);
        toast.success('Đăng ký thành công! Chào mừng bạn đến với SelfForge 🎉');
      } else {
        await login(email, password);
        toast.success('Đăng nhập thành công!');
      }
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Có lỗi xảy ra';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card scale-in">
        <h1>⚔️ SelfForge</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Tạo tài khoản để bắt đầu hành trình kỷ luật' : 'Đăng nhập để tiếp tục hành trình'}
        </p>

        {error && <div className="auth-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input type="text" className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tên của bạn" required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
          </a>
        </div>
      </div>
    </div>
  );
}
