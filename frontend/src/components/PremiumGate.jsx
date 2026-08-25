import { useNavigate } from 'react-router-dom';
import { usePremium } from '../context/PremiumContext';

/**
 * Wraps content that requires Premium.
 * - mode="page" → blocks the entire page with a full overlay
 * - mode="section" → blocks a specific section with a smaller overlay
 * - If user is premium, children render normally
 */
export default function PremiumGate({ children, mode = 'page', feature = '' }) {
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  if (isPremium) {
    return children;
  }

  if (mode === 'page') {
    return (
      <div className="premium-gate premium-gate-page fade-in">
        <div className="premium-gate-content">
          <span className="premium-gate-icon">👑</span>
          <h2>Tính năng Premium</h2>
          <p className="premium-gate-desc">
            {feature
              ? `"${feature}" là tính năng dành cho người dùng Premium.`
              : 'Tính năng này dành cho người dùng Premium.'}
          </p>
          <p className="premium-gate-sub">
            Nâng cấp để mở khóa toàn bộ tính năng nâng cao!
          </p>
          <button className="btn btn-premium" onClick={() => navigate('/premium')}>
            ⭐ Nâng cấp Premium
          </button>
        </div>
      </div>
    );
  }

  // mode === 'section'
  return (
    <div className="premium-gate premium-gate-section">
      <div className="premium-gate-section-overlay">
        <span className="premium-gate-lock">🔒</span>
        <span className="premium-gate-label">Premium</span>
        <button className="btn btn-premium btn-sm" onClick={() => navigate('/premium')}>
          Nâng cấp
        </button>
      </div>
      <div className="premium-gate-blurred">
        {children}
      </div>
    </div>
  );
}
