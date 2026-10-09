# Phase 1 — Đợt 15: đăng ký qua OTP email

Ngày: 26/09/2026. Không deploy.

## Đã xây dựng
- API chính sách đăng ký, xin mã và trường code trong API register.
- Khi bật required, chỉ tạo user và session sau xác minh. SMTP thiếu cấu hình thì chặn, không tự hạ về đăng ký thường.
- Chế độ mặc định vẫn tương thích đăng ký cũ; bật bằng REGISTRATION_REQUIRE_EMAIL_VERIFICATION=true sau cấu hình email.
- UI nhập/gửi lại OTP, countdown 60 giây, khóa thao tác khi đang gửi, xử lý chính sách chưa tải hoặc SMTP chưa sẵn sàng.
- Hash OTP, hạn 10 phút, 5 lần sai, 3 lần gửi mỗi giờ/email.
- Tách challenge đăng ký khỏi reset mật khẩu. Challenge không chứa password.
- Khóa challenge tồn tại; persist và unique email xử lý hai request tạo challenge đầu tiên. Request thua tranh chấp trả phản hồi chung 202, không gửi thêm mail.
- V5 thêm registration_code và app_user.email_verified_at; tài khoản cũ giữ null, không bị khóa.
- Không rollback bộ đếm sai khi API register trả lỗi mã; tiêu thụ mã và tạo tài khoản/phiên cùng giao dịch.

## Kiểm chứng
- Maven verify: **111 tests**, 0 failures/errors/skipped; BUILD SUCCESS và JAR đã đóng gói.
- 7 test mới với email mock và schema H2 qua Flyway: tạo sau xác minh/phiên; sai hết lượt; hạn/cooldown/quota; email đã tồn tại; không fallback khi thiếu SMTP; lỗi delivery; request gửi đầu tiên đồng thời chỉ một mail.
- Log unique-key trong test đồng thời là tranh chấp dự kiến, được xử lý bằng phản hồi chung; test thành công.
- Lint frontend không lỗi, 4 warning cũ; build thành công; bundle static đồng bộ.
- git diff --check: qua. Log: target/phase1-batch15.log.
- Chưa nghiệm thu SMTP thật, E2E trình duyệt hoặc PostgreSQL V5.

## Bước tiếp
Xem REGISTRATION_EMAIL.md để bật và thử bằng email người dùng sở hữu. SMTP vẫn dùng cấu hình đợt 14; không cần gửi secret vào chat.

Cần giới hạn IP/tổng hoặc CAPTCHA và cleanup challenge trước public. OAuth, OTP đổi mật khẩu hồ sơ, đa ngôn ngữ và phần còn lại kế hoạch vẫn chưa hoàn tất.