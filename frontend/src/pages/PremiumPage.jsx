import { useLanguage } from '../context/useLanguage';
import { usePremium } from '../context/usePremium';

const FREE_FEATURES = [
  { name: 'Thói quen', desc: 'Tối đa 10 thói quen đang bật' },
  { name: 'Check-in', desc: 'Hàng ngày' },
  { name: 'Streak', desc: 'Theo dõi chuỗi' },
  { name: 'Nhật ký', desc: 'Toàn bộ lịch sử' },
  { name: 'Dashboard', desc: 'Tổng quan cơ bản' },
  { name: 'Giao diện', desc: 'Tối / Sáng' },
  { name: 'Thử thách', desc: 'Tạo và tham gia' },
  { name: 'Pomodoro', desc: 'Bộ hẹn giờ' },
  { name: 'Mục tiêu', desc: 'Tối đa 3 mục tiêu đang thực hiện' },
  { name: 'Mood', desc: 'Toàn bộ lịch sử' },
  { name: 'Streak Freeze', desc: '1 lần/tháng' },
  { name: 'Weekly Review', desc: 'Đánh giá tuần', beta: true },
];

const PREMIUM_FEATURES = [
  { name: 'Thói quen', desc: 'Không giới hạn', highlight: true },
  { name: 'Mục tiêu', desc: 'Không giới hạn', highlight: true },
  { name: 'Streak Freeze', desc: '5 lần/tháng', highlight: true },
  { name: 'Phần thưởng', desc: 'Tự tạo phần thưởng', highlight: true },
  { name: 'Export CSV', desc: 'Xuất dữ liệu', highlight: true },
];

const PLANS = [
  {
    name: 'Hàng tháng',
    price: '49.000đ',
    period: '/tháng',
    desc: 'Thời hạn dự kiến: 1 tháng',
    popular: false,
  },
  {
    name: 'Hàng năm',
    price: '399.000đ',
    period: '/năm',
    desc: 'Thời hạn dự kiến: 1 năm',
    popular: true,
  },
  {
    name: 'Trọn đời',
    price: '999.000đ',
    period: 'một lần',
    desc: 'Gói dự kiến, chưa mở bán',
    popular: false,
  },
];

export default function PremiumPage() {
  const { t, language } = useLanguage();
  const { isPremium, premiumTier, premiumExpiresAt, loading, error, refreshPremium } = usePremium();

  if (isPremium) {
    return (
      <div className="premium-page fade-in">
        <div className="premium-active-card">
          <span className="premium-eyebrow">{t("Gói của bạn")}</span>
          <h2>{t("Bạn đang là Premium!")}</h2>
          <p className="premium-active-tier">
            {t('Gói')}: <strong>{t(premiumTier === 'LIFETIME' ? 'Trọn đời' : 'Premium')}</strong>
          </p>
          {premiumExpiresAt && (
            <p className="premium-active-expiry">
              {t('Hết hạn')}: {new Date(premiumExpiresAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}
            </p>
          )}
          <p className="premium-active-desc">
            {t("Bạn đang sử dụng toàn bộ tính năng nâng cao. Cảm ơn bạn đã ủng hộ SelfForge!")}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => void refreshPremium()} disabled={loading}>
            {t(loading ? 'Đang tải lại trạng thái...' : 'Tải lại trạng thái Premium')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page fade-in">
      {/* Hero */}
      <div className="premium-hero">
        <span className="premium-eyebrow">{t("Nâng cấp trải nghiệm")}</span>
        <h1>SelfForge Premium</h1>
        <p>{t("Mở khóa toàn bộ sức mạnh của SelfForge")}</p>
      </div>

      <div className="card premium-availability-card" role="note">
        <strong>{t('Premium chưa mở bán')}</strong>
        <p>{t('Giá bên dưới là dự kiến bằng VND. Thanh toán và tự động kích hoạt chưa khả dụng; bạn chưa cần chuyển khoản.')}</p>
        {error && <p className="premium-availability-error" role="alert">{t('Chưa tải được trạng thái Premium mới nhất. Các tính năng nâng cao sẽ vẫn khóa cho đến khi kết nối lại.')}</p>}
        <button type="button" className="btn btn-secondary" onClick={() => void refreshPremium()} disabled={loading}>
          {t(loading ? 'Đang tải lại trạng thái...' : 'Tải lại trạng thái Premium')}
        </button>
      </div>
      {/* Pricing cards */}
      <div className="premium-plans">
        {PLANS.map((plan) => (
          <div key={plan.name} className={`premium-plan-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <span className="premium-plan-badge">{t("Gói đề xuất")}</span>}
            <h3>{t(plan.name)}</h3>
            <div className="premium-plan-price">
              <span className="price-main">{plan.price}</span>
              <span className="price-period">{t(plan.period)}</span>
            </div>
            <p className="premium-plan-desc">{t(plan.desc)}</p>
            <p className="premium-plan-unavailable" role="status">{t('Chưa mở bán')}</p>
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div className="premium-comparison">
        <h2>{t("So sánh tính năng")}</h2>
        <div className="premium-comparison-grid">
          {/* Free column */}
          <div className="premium-col">
            <div className="premium-col-header free">
              <h3>Free</h3>
              <span className="premium-col-price">{t("Miễn phí")}</span>
            </div>
            <ul className="premium-feature-list">
              {FREE_FEATURES.map((f) => (
                <li key={f.name + f.desc}>

                  <div>
                    <strong>{t(f.name)}</strong>
                    <span>{f.beta ? (language === 'en' ? 'Available free during public beta' : 'Mở miễn phí trong beta công khai') : t(f.desc)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium column */}
          <div className="premium-col">
            <div className="premium-col-header premium">
              <h3>Premium</h3>
              <span className="premium-col-price">{t("Từ 49.000đ/tháng")}</span>
            </div>
            <p className="premium-col-summary">{t("Bao gồm các tính năng Free, cùng các quyền lợi nâng cao:")}</p>
            <ul className="premium-feature-list">

              {PREMIUM_FEATURES.filter(f => f.highlight).map((f) => (
                <li key={f.name} className="feature-highlight">

                  <div>
                    <strong>{t(f.name)}</strong>
                    <span>{t(f.desc)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
