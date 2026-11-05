import { useLanguage } from '../context/useLanguage';
import { useNavigate } from 'react-router-dom';
import { usePremium } from '../context/usePremium';

/**
 * Wraps content that requires Premium.
 * - mode="page" → blocks the entire page with a full overlay
 * - mode="section" → blocks a specific section with a smaller overlay
 * - If user is premium, children render normally
 */
export default function PremiumGate({ children, mode = 'page', feature = '' }) {
  const { t } = useLanguage();
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  if (isPremium) {
    return children;
  }

  if (mode === 'page') {
    return (
      <div className="premium-gate premium-gate-page fade-in">
        <div className="premium-gate-content">
          <span className="premium-eyebrow">SelfForge Premium</span>
          <h2>{t("Tính năng Premium")}</h2>
          <p className="premium-gate-desc">
            {feature
              ? t('"{feature}" là tính năng dành cho người dùng Premium.', { feature: t(feature) })
              : t('Tính năng này dành cho người dùng Premium.')}
          </p>
          <p className="premium-gate-sub">
            {t('Premium chưa mở bán. Bạn vẫn có thể dùng các chức năng miễn phí.')}
          </p>
          <button className="btn btn-premium" onClick={() => navigate('/premium')}>
            {t('Xem thông tin Premium')}
          </button>
        </div>
      </div>
    );
  }

  // mode === 'section'
  return (
    <div className="premium-gate premium-gate-section">
      <div className="premium-gate-section-overlay">

        <span className="premium-gate-label">Premium</span>
        <button className="btn btn-premium btn-sm" onClick={() => navigate('/premium')}>
          {t('Nâng cấp')}
        </button>
      </div>
      <div className="premium-gate-blurred" inert aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
