# Đăng ký bằng OTP email

Ngày: 26/09/2026. Chưa deploy; chưa gửi email thật.

## Bật chức năng
1. Cấu hình SMTP và địa chỉ gửi theo PASSWORD_RESET_EMAIL.md. Adapter gửi OTP hiện dùng chung cấu hình PASSWORD_RESET_ENABLED=true và PASSWORD_RESET_FROM.
2. Đặt REGISTRATION_REQUIRE_EMAIL_VERIFICATION=true rồi restart backend.
3. GET /api/auth/registration/availability phải trả required=true, enabled=true.

Khi required=true nhưng SMTP chưa cấu hình, API đăng ký trả 503, không tự bỏ qua OTP. Khi cờ false (mặc định), giữ luồng đăng ký cũ để tương thích bản đang chạy; đây không phải chế độ đăng ký đã xác minh email.

Không gửi SMTP password hoặc OTP vào chat.

## Hành vi
- POST /api/auth/registration/request nhận email; normalize trim/lowercase; trả cùng thông báo 202 cho email mới, email đã tồn tại hoặc còn cooldown.
- Email chưa xác minh chỉ có bản ghi challenge, chưa có AppUser, phiên hay mật khẩu lưu trong challenge.
- POST /api/auth/register dùng email/displayName/password như cũ, thêm code khi bắt buộc xác minh.
- Mã 6 số, 10 phút, 5 lần sai, gửi lại cách 60 giây và tối đa 3 lần trong cửa sổ một giờ/email. Mã chỉ lưu PBKDF2 salted.
- Xác minh, tạo tài khoản, ghi emailVerifiedAt và cấp phiên nằm trong cùng giao dịch. Lỗi mã phải giữ bộ đếm sai; lỗi khác rollback.
- Challenge đăng ký và reset mật khẩu dùng bảng riêng. Tài khoản cũ không bị đánh dấu verified hoặc khóa đăng nhập.
- V5 tạo registration_code và thêm app_user.email_verified_at nullable. Không sửa V1–V4.

## Nghiệm thu email thật
Dùng địa chỉ bạn sở hữu chưa có tài khoản; nhận mã, thử sai mã, nhập đúng và kiểm tra đăng nhập. Thử SMTP tắt khi vẫn bật required: đăng ký phải bị chặn, không tạo tài khoản. Kiểm tra bản frontend và backend cùng phiên bản.

## Còn lại trước public
- Cần rate limit tổng/IP hoặc CAPTCHA, đặc biệt endpoint gửi đến email chưa đăng ký; hạn theo email không chặn việc lạm dụng nhiều địa chỉ.
- Chưa có cleanup challenge hết hạn; không xóa các bộ đếm đang còn trong cửa sổ quota.
- Chưa nghiệm thu email thật, trình duyệt hoặc PostgreSQL V5.
- SMTP đồng bộ trong transaction; chưa có outbox. Cần theo dõi hiệu năng khi provider chậm.
- HTTP đăng ký cho email đã tồn tại vẫn giữ thông báo cũ; phản hồi xin mã đồng nhất nội dung/status nhưng không đồng đều thời gian.
- Retry sau khi tài khoản đã tạo nhưng mất response có thể báo email tồn tại; người dùng đăng nhập bằng mật khẩu vừa đặt.