import {Link, useLocation} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {configuredSupportEmail} from '../utils/supportContact';

const supportEmail = configuredSupportEmail(import.meta.env.VITE_SUPPORT_EMAIL);

function Privacy({en}) {
  return <>
    <p className="public-information-lead">{en
      ? 'This notice explains the data SelfForge needs to provide your habit-tracking account. It is written for the current product, not as a promise about future features.'
      : 'Thông báo này giải thích dữ liệu SelfForge cần để cung cấp tài khoản theo dõi thói quen. Nội dung mô tả sản phẩm hiện tại, không phải lời hứa về tính năng trong tương lai.'}</p>
    <section><h2>{en ? 'Data we handle' : 'Dữ liệu chúng tôi xử lý'}</h2><p>{en ? 'Your account can contain:' : 'Tài khoản của bạn có thể gồm:'}</p><ul>
      <li>{en ? 'account information such as email address, display name, time zone, and account-security sessions;' : 'thông tin tài khoản như email, tên hiển thị, múi giờ và các phiên bảo mật tài khoản;'}</li>
      <li>{en ? 'the habits, check-ins, goals, reminders, rewards, focus sessions, journal entries, mood entries, and plans that you choose to save;' : 'thói quen, check-in, mục tiêu, nhắc nhở, phần thưởng, phiên tập trung, nhật ký, tâm trạng và kế hoạch do bạn chọn lưu;'}</li>
      <li>{en ? 'technical information needed to operate and troubleshoot the service, such as app version, browser/device capability, time zone, and a server-generated request ID.' : 'thông tin kỹ thuật cần để vận hành và xử lý sự cố, như phiên bản ứng dụng, khả năng trình duyệt/thiết bị, múi giờ và mã yêu cầu do máy chủ tạo.'}</li>
    </ul></section>
    <section><h2>{en ? 'Why we use it' : 'Mục đích sử dụng'}</h2><p>{en ? 'We use saved data to show your account, calculate the progress shown in the app, sync your activity, protect access, answer a support report you choose to send, and meet any legal obligations that apply. SelfForge does not sell your journal or habit data.' : 'Chúng tôi dùng dữ liệu đã lưu để hiển thị tài khoản, tính tiến độ trong ứng dụng, đồng bộ hoạt động, bảo vệ truy cập, xử lý báo lỗi mà bạn chủ động gửi và đáp ứng nghĩa vụ pháp lý nếu có. SelfForge không bán dữ liệu nhật ký hoặc thói quen của bạn.'}</p></section>
    <section><h2>{en ? 'Optional providers and features' : 'Nhà cung cấp và tính năng tùy chọn'}</h2><p>{en ? 'Email verification or password-reset messages are sent only when email delivery is enabled. Google or Facebook sign-in is used only when you choose it and the provider is enabled. AI features are off by default; when enabled, the relevant screen must explain the limited context before a request is made. Do not include private journal text in AI input unless the screen explicitly asks for your permission.' : 'Email xác minh hoặc đặt lại mật khẩu chỉ được gửi khi tính năng gửi email được bật. Đăng nhập Google hoặc Facebook chỉ dùng khi bạn chọn và nhà cung cấp đã được bật. AI mặc định tắt; khi bật, màn hình liên quan phải giải thích ngữ cảnh giới hạn trước khi gửi yêu cầu. Không đưa nhật ký riêng tư vào dữ liệu AI trừ khi màn hình hỏi rõ sự đồng ý của bạn.'}</p></section>
    <section><h2>{en ? 'Your choices' : 'Lựa chọn của bạn'}</h2><ul>
      <li>{en ? 'Update profile information and manage or revoke account sessions from Profile.' : 'Cập nhật hồ sơ, quản lý hoặc thu hồi phiên đăng nhập tại trang Cá nhân.'}</li>
      <li>{en ? 'Download a personal JSON copy and selected CSV exports from Profile and the relevant activity screens.' : 'Tải bản sao JSON cá nhân và các bản xuất CSV phù hợp từ trang Cá nhân và các màn hoạt động.'}</li>
      <li>{en ? 'Request deletion from Profile. Deletion revokes active sessions and removes account data handled by the application; keep a copy of anything you want to retain first.' : 'Yêu cầu xóa từ trang Cá nhân. Việc xóa thu hồi các phiên đang hoạt động và xóa dữ liệu tài khoản mà ứng dụng xử lý; hãy giữ bản sao nội dung bạn muốn lưu trước.'}</li>
    </ul></section>
    <section><h2>{en ? 'Security and retention' : 'Bảo mật và lưu giữ'}</h2><p>{en ? 'No online service can guarantee absolute security. Use a unique password, keep your device protected, and revoke sessions you do not recognise. The account-security activity list keeps only action names and timestamps for up to 90 days; it does not retain IP addresses, device details, tokens, passwords, or private content. Other data is kept while your account remains active unless a feature states a shorter period; deletion is the way to remove an account from the active service.' : 'Không có dịch vụ trực tuyến nào bảo đảm an toàn tuyệt đối. Hãy dùng mật khẩu riêng, bảo vệ thiết bị và thu hồi các phiên bạn không nhận ra. Danh sách hoạt động bảo mật chỉ giữ tên thao tác và thời điểm tối đa 90 ngày; không lưu địa chỉ IP, thông tin thiết bị, token, mật khẩu hoặc nội dung riêng tư. Dữ liệu khác được giữ khi tài khoản còn hoạt động trừ khi tính năng nêu thời hạn ngắn hơn; xóa tài khoản là cách xóa tài khoản khỏi dịch vụ đang hoạt động.'}</p></section>
  </>;
}

function Terms({en}) {
  return <>
    <p className="public-information-lead">{en
      ? 'These terms set the basic rules for using SelfForge as a personal habit-tracking tool.'
      : 'Điều khoản này nêu các quy tắc cơ bản khi sử dụng SelfForge như một công cụ theo dõi thói quen cá nhân.'}</p>
    <section><h2>{en ? 'Using the service' : 'Sử dụng dịch vụ'}</h2><p>{en ? 'Use SelfForge lawfully and only with an account you are authorised to use. Keep login credentials private and tell us through the support channel if you believe access to your account has been compromised.' : 'Hãy sử dụng SelfForge hợp pháp và chỉ với tài khoản bạn được phép dùng. Giữ kín thông tin đăng nhập và báo qua kênh hỗ trợ nếu bạn cho rằng tài khoản đã bị truy cập trái phép.'}</p></section>
    <section><h2>{en ? 'Your content' : 'Nội dung của bạn'}</h2><p>{en ? 'You remain responsible for the content you save. Do not use the service to upload unlawful content, to attempt unauthorised access, to disrupt the service, or to interfere with another person’s account. You can export or delete your account data from Profile.' : 'Bạn vẫn chịu trách nhiệm về nội dung mình lưu. Không dùng dịch vụ để tải nội dung bất hợp pháp, cố truy cập trái phép, gây gián đoạn dịch vụ hoặc can thiệp vào tài khoản người khác. Bạn có thể xuất hoặc xóa dữ liệu tài khoản tại trang Cá nhân.'}</p></section>
    <section><h2>{en ? 'Health and productivity' : 'Sức khỏe và năng suất'}</h2><p>{en ? 'SelfForge provides organisation and reflection tools. It is not medical, mental-health, legal, or financial advice, and it must not be used instead of professional help or emergency services.' : 'SelfForge cung cấp công cụ tổ chức và suy ngẫm. Ứng dụng không phải tư vấn y tế, sức khỏe tinh thần, pháp lý hoặc tài chính và không được dùng thay cho chuyên gia hoặc dịch vụ khẩn cấp.'}</p></section>
    <section><h2>{en ? 'Availability and changes' : 'Khả dụng và thay đổi'}</h2><p>{en ? 'We may update, pause, or remove a feature when needed for security, maintenance, legal compliance, or product development. We aim to avoid unnecessary disruption, but you should keep your own export of important information. Features marked unavailable, including payments or third-party sign-in, are not offered until the app explicitly enables them.' : 'Chúng tôi có thể cập nhật, tạm dừng hoặc gỡ một tính năng khi cần cho bảo mật, bảo trì, tuân thủ pháp luật hoặc phát triển sản phẩm. Chúng tôi cố tránh gián đoạn không cần thiết, nhưng bạn nên giữ bản xuất riêng của thông tin quan trọng. Tính năng được đánh dấu chưa khả dụng, gồm thanh toán hoặc đăng nhập bên thứ ba, chưa được cung cấp cho đến khi ứng dụng bật rõ ràng.'}</p></section>
    <section><h2>{en ? 'Contact and updates' : 'Liên hệ và cập nhật'}</h2><p>{supportEmail
      ? (en ? <>For questions about these terms or privacy, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Material changes will be reflected on this page.</> : <>Nếu có câu hỏi về điều khoản hoặc quyền riêng tư, hãy liên hệ <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Các thay đổi quan trọng sẽ được phản ánh trên trang này.</>)
      : (en ? 'A public support email has not been configured yet. Before a public commercial launch, the operator must publish a support contact here. Material changes will be reflected on this page.' : 'Email hỗ trợ công khai chưa được cấu hình. Trước khi mở bán công khai, đơn vị vận hành cần công bố kênh hỗ trợ tại đây. Các thay đổi quan trọng sẽ được phản ánh trên trang này.')}</p></section>
  </>;
}

export default function PublicInformationPage({kind}) {
  const {language} = useLanguage();
  const {pathname} = useLocation();
  const en = language === 'en';
  const privacy = kind === 'privacy';
  const title = privacy ? (en ? 'Privacy notice' : 'Thông báo quyền riêng tư') : (en ? 'Terms of use' : 'Điều khoản sử dụng');
  return <main className="public-information-page">
    <header className="public-information-header"><Link className="brand-heading" to="/login" aria-label={en ? 'Return to sign in' : 'Quay lại đăng nhập'}><img src="/icons/icon-192.png" className="brand-logo" alt="" width="44" height="44"/>SelfForge</Link><nav aria-label={en ? 'Legal pages' : 'Trang pháp lý'}><Link aria-current={privacy ? 'page' : undefined} to="/privacy">{en ? 'Privacy' : 'Quyền riêng tư'}</Link><Link aria-current={!privacy ? 'page' : undefined} to="/terms">{en ? 'Terms' : 'Điều khoản'}</Link></nav></header>
    <article className="public-information-card"><p className="public-information-meta">{en ? 'Last updated: 28 October 2026' : 'Cập nhật lần cuối: 28/10/2026'}</p><h1>{title}</h1>{privacy ? <Privacy en={en}/> : <Terms en={en}/>}<footer><Link className="btn btn-secondary" to={`/login?next=${encodeURIComponent(pathname)}`}>{en ? 'Return to sign in' : 'Quay lại đăng nhập'}</Link></footer></article>
  </main>;
}
