import { usePremium } from '../context/PremiumContext';

const FREE_FEATURES = [
  { icon: '🎯', name: 'Thói quen', desc: 'Tối đa 10 thói quen' },
  { icon: '✅', name: 'Check-in', desc: 'Hàng ngày' },
  { icon: '🔥', name: 'Streak', desc: 'Theo dõi chuỗi' },
  { icon: '📝', name: 'Nhật ký', desc: '7 ngày gần nhất' },
  { icon: '📊', name: 'Dashboard', desc: 'Tổng quan cơ bản' },
  { icon: '🌓', name: 'Giao diện', desc: 'Tối / Sáng' },
  { icon: '⚡', name: 'Thử thách', desc: 'Tạo và tham gia' },
  { icon: '⏱', name: 'Pomodoro', desc: 'Bộ hẹn giờ' },
  { icon: '🎯', name: 'Mục tiêu', desc: 'Tối đa 3 mục tiêu' },
  { icon: '😊', name: 'Mood', desc: '7 ngày gần nhất' },
  { icon: '❄️', name: 'Streak Freeze', desc: '1 lần/tháng' },
];

const PREMIUM_FEATURES = [
  { icon: '♾️', name: 'Thói quen', desc: 'Không giới hạn', highlight: true },
  { icon: '♾️', name: 'Mục tiêu', desc: 'Không giới hạn', highlight: true },
  { icon: '📝', name: 'Nhật ký', desc: 'Toàn bộ lịch sử', highlight: true },
  { icon: '😊', name: 'Mood', desc: 'Toàn bộ lịch sử', highlight: true },
  { icon: '❄️', name: 'Streak Freeze', desc: '5 lần/tháng', highlight: true },
  { icon: '📋', name: 'Weekly Review', desc: 'Đánh giá tuần', highlight: true },
  { icon: '🎁', name: 'Phần thưởng', desc: 'Tự tạo phần thưởng', highlight: true },
  { icon: '📤', name: 'Export CSV', desc: 'Xuất dữ liệu', highlight: true },
  { icon: '📦', name: 'Templates', desc: 'Bộ thói quen mẫu', highlight: true },
  { icon: '🔗', name: 'Habit Stacking', desc: 'Xếp thói quen', highlight: true },
  { icon: '🔥', name: 'Combo x1.5', desc: 'Điểm nhân đôi', highlight: true },
];

const PLANS = [
  {
    name: 'Hàng tháng',
    price: '49.000đ',
    priceUsd: '$1.99',
    period: '/tháng',
    desc: 'Linh hoạt, hủy bất cứ lúc nào',
    popular: false,
  },
  {
    name: 'Hàng năm',
    price: '399.000đ',
    priceUsd: '$15.99',
    period: '/năm',
    desc: 'Tiết kiệm 32%',
    popular: true,
  },
  {
    name: 'Trọn đời',
    price: '999.000đ',
    priceUsd: '$39.99',
    period: 'một lần',
    desc: 'Mua 1 lần, dùng mãi mãi',
    popular: false,
  },
];

export default function PremiumPage() {
  const { isPremium, premiumTier, premiumExpiresAt } = usePremium();

  if (isPremium) {
    return (
      <div className="premium-page fade-in">
        <div className="premium-active-card">
          <span className="premium-active-icon">👑</span>
          <h2>Bạn đang là Premium!</h2>
          <p className="premium-active-tier">
            Gói: <strong>{premiumTier === 'LIFETIME' ? 'Trọn đời' : 'Premium'}</strong>
          </p>
          {premiumExpiresAt && (
            <p className="premium-active-expiry">
              Hết hạn: {new Date(premiumExpiresAt).toLocaleDateString('vi-VN')}
            </p>
          )}
          <p className="premium-active-desc">
            Bạn đang sử dụng toàn bộ tính năng nâng cao. Cảm ơn bạn đã ủng hộ SelfForge! 🎉
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page fade-in">
      {/* Hero */}
      <div className="premium-hero">
        <span className="premium-hero-icon">👑</span>
        <h1>SelfForge Premium</h1>
        <p>Mở khóa toàn bộ sức mạnh của SelfForge</p>
      </div>

      {/* Pricing cards */}
      <div className="premium-plans">
        {PLANS.map((plan) => (
          <div key={plan.name} className={`premium-plan-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <span className="premium-plan-badge">Phổ biến nhất</span>}
            <h3>{plan.name}</h3>
            <div className="premium-plan-price">
              <span className="price-main">{plan.price}</span>
              <span className="price-usd">{plan.priceUsd}</span>
              <span className="price-period">{plan.period}</span>
            </div>
            <p className="premium-plan-desc">{plan.desc}</p>
            <button className="btn btn-premium" disabled>
              Sắp ra mắt
            </button>
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div className="premium-comparison">
        <h2>So sánh tính năng</h2>
        <div className="premium-comparison-grid">
          {/* Free column */}
          <div className="premium-col">
            <div className="premium-col-header free">
              <h3>Free</h3>
              <span className="premium-col-price">Miễn phí</span>
            </div>
            <ul className="premium-feature-list">
              {FREE_FEATURES.map((f) => (
                <li key={f.name + f.desc}>
                  <span className="feature-icon">{f.icon}</span>
                  <div>
                    <strong>{f.name}</strong>
                    <span>{f.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium column */}
          <div className="premium-col">
            <div className="premium-col-header premium">
              <h3>👑 Premium</h3>
              <span className="premium-col-price">Từ 49.000đ/tháng</span>
            </div>
            <ul className="premium-feature-list">
              {FREE_FEATURES.map((f) => (
                <li key={f.name + 'p'}>
                  <span className="feature-icon">✅</span>
                  <div>
                    <strong>{f.name}</strong>
                    <span>Đầy đủ</span>
                  </div>
                </li>
              ))}
              {PREMIUM_FEATURES.filter(f => f.highlight).map((f) => (
                <li key={f.name} className="feature-highlight">
                  <span className="feature-icon">{f.icon}</span>
                  <div>
                    <strong>{f.name}</strong>
                    <span>{f.desc}</span>
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
