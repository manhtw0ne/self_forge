import { Link } from 'react-router-dom';
import InstallApp from '../components/InstallApp';
import { useLanguage } from '../context/useLanguage';

const copy = {
  vi: {
    signIn: 'Đăng nhập',
    eyebrow: 'SelfForge · xây kỷ luật theo nhịp của bạn',
    title: 'Biến những việc nhỏ thành tiến độ bạn nhìn thấy được.',
    description: 'Lập thói quen, check-in điều đã làm, suy ngẫm và điều chỉnh. SelfForge không phạt bạn vì nghỉ; nó giúp bạn tìm bước tiếp theo khi muốn quay lại.',
    start: 'Bắt đầu miễn phí',
    explore: 'Xem cách hoạt động',
    trusted: 'Không cần thẻ thanh toán để bắt đầu · Dữ liệu gắn với tài khoản của bạn',
    featuresTitle: 'Một vòng lặp đơn giản để duy trì lâu dài',
    features: [
      ['Ghi nhận điều đã làm', 'Tạo thói quen phù hợp với sức của bạn, rồi check-in khi đã thực hiện ngoài đời.'],
      ['Nhìn lại có căn cứ', 'Nhật ký, mục tiêu, Pomodoro và tổng kết tuần giúp bạn thấy điều gì đang hiệu quả.'],
      ['Bắt đầu lại nhẹ nhàng', 'Khi mất nhịp, giảm mục tiêu xuống bước nhỏ nhất thay vì biến mọi thứ thành một streak phải giữ.'],
    ],
    companionTitle: 'Bạn đồng hành là dấu mốc, không phải một trò chơi.',
    companion: 'Ba loài và ba hình thái phản ánh XP từ check-in hợp lệ. Không có nhiệm vụ chăm thú, không có phạt khi bạn vắng mặt và không mua sức mạnh.',
    privacyTitle: 'Bạn kiểm soát dữ liệu của mình.',
    privacy: 'Nhật ký và ghi chú không tự gửi cho AI. Khi một tính năng AI có thể dùng nội dung bạn chọn, SelfForge yêu cầu bạn xác nhận trước từng lần.',
    privacyLink: 'Đọc thông báo quyền riêng tư',
    finalTitle: 'Bắt đầu với một thói quen thật nhỏ.',
    final: 'Bạn có thể tạo tài khoản, thử luồng cốt lõi và quyết định sau. Không có Premium bắt buộc khi khởi đầu.',
    create: 'Tạo tài khoản',
    terms: 'Điều khoản',
    privacyShort: 'Quyền riêng tư',
  },
  en: {
    signIn: 'Sign in',
    eyebrow: 'SelfForge · build discipline at your own pace',
    title: 'Turn small actions into progress you can see.',
    description: 'Plan habits, record what you did, reflect, and adjust. SelfForge does not punish time away; it helps you find a next step when you want to return.',
    start: 'Start free',
    explore: 'See how it works',
    trusted: 'No payment card needed to begin · Your data stays tied to your account',
    featuresTitle: 'One simple loop for sustainable progress',
    features: [
      ['Record real action', 'Create habits that fit your capacity, then check in after you have done them in real life.'],
      ['Review with context', 'Journal, goals, Pomodoro, and weekly review help you see what is actually working.'],
      ['Restart gently', 'When your rhythm breaks, reduce the plan to its smallest step instead of turning everything into a streak to protect.'],
    ],
    companionTitle: 'A companion is a milestone, not a game.',
    companion: 'Three species and three forms reflect XP from valid check-ins. There are no care chores, absence penalties, or power-ups to buy.',
    privacyTitle: 'You stay in control of your data.',
    privacy: 'Journal entries and notes are never sent to AI automatically. When an AI feature can use content you select, SelfForge asks for confirmation each time.',
    privacyLink: 'Read the Privacy Notice',
    finalTitle: 'Start with one genuinely small habit.',
    final: 'Create an account, try the core workflow, then decide what helps. Premium is never required to get started.',
    create: 'Create account',
    terms: 'Terms',
    privacyShort: 'Privacy',
  },
};

export default function LandingPage() {
  const { language } = useLanguage();
  const text = copy[language === 'en' ? 'en' : 'vi'];

  return <main className="landing-page fade-in">
    <header className="landing-nav">
      <Link className="landing-brand" to="/" aria-label="SelfForge home">
        <img src="/icons/icon-192.png" width="40" height="40" alt="" />
        <span>SelfForge</span>
      </Link>
      <Link className="btn btn-secondary btn-sm" to="/login">{text.signIn}</Link>
    </header>

    <section className="landing-hero" aria-labelledby="landing-title">
      <div>
        <p className="landing-eyebrow">{text.eyebrow}</p>
        <h1 id="landing-title">{text.title}</h1>
        <p className="landing-lede">{text.description}</p>
        <div className="landing-actions">
          <Link className="btn btn-primary" to="/login?mode=register">{text.start}</Link>
          <a className="btn btn-secondary" href="#how-it-works">{text.explore}</a>
        </div>
        <p className="landing-trust">{text.trusted}</p>
      </div>
      <aside className="landing-summary" aria-label={text.featuresTitle}>
        <span>01</span><strong>{text.features[0][0]}</strong>
        <span>02</span><strong>{text.features[1][0]}</strong>
        <span>03</span><strong>{text.features[2][0]}</strong>
      </aside>
    </section>

    <section id="how-it-works" className="landing-section" aria-labelledby="landing-how-title">
      <h2 id="landing-how-title">{text.featuresTitle}</h2>
      <div className="landing-feature-grid">
        {text.features.map(([title, description], index) => <article key={title} className="card landing-feature">
          <span className="landing-feature-number">0{index + 1}</span>
          <h3>{title}</h3><p>{description}</p>
        </article>)}
      </div>
    </section>

    <section className="landing-section landing-two-column">
      <article className="card"><h2>{text.companionTitle}</h2><p>{text.companion}</p><Link to="/login?mode=register">{text.start}</Link></article>
      <article className="card"><h2>{text.privacyTitle}</h2><p>{text.privacy}</p><Link to="/privacy">{text.privacyLink}</Link></article>
    </section>

    <section className="landing-final" aria-labelledby="landing-final-title">
      <h2 id="landing-final-title">{text.finalTitle}</h2><p>{text.final}</p>
      <Link className="btn btn-primary" to="/login?mode=register">{text.create}</Link>
      <div className="landing-install"><InstallApp /></div>
      <p><Link to="/terms">{text.terms}</Link> <span aria-hidden="true">·</span> <Link to="/privacy">{text.privacyShort}</Link></p>
    </section>
  </main>;
}
