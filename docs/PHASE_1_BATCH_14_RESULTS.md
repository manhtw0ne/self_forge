# Phase 1 — Đợt 14: quên mật khẩu qua OTP email

Ngày: 26/09/2026. Không deploy.

## Đã xây dựng
- API availability/request/confirm và form Quên mật khẩu ở trang đăng nhập.
- Nhập OTP, mật khẩu mới và xác nhận; trạng thái đang xử lý, gửi lại và thông báo kết quả.
- SMTP qua Spring Mail, STARTTLS bắt buộc/timeout; mặc định tắt và ẩn tính năng khi thiếu cấu hình.
- Mã 6 chữ số sinh SecureRandom, lưu PBKDF2 salted, hiệu lực 10 phút.
- 5 lần sai/mã; cooldown gửi 60 giây, tối đa 3 lần mỗi giờ/tài khoản. Gửi lại thay mã cũ.
- Response xin mã không tiết lộ tài khoản qua nội dung/status. Mail lỗi hủy mã, giữ hạn mức; log không chứa email hoặc OTP.
- Reset thành công thu hồi phiên, tiêu thụ OTP; xử lý bằng transaction và khóa user.
- Đăng nhập, sửa hồ sơ, đổi mật khẩu phối hợp khóa user; refresh trước kiểm tra mật khẩu cũ để tránh đọc hash cũ sau khi chờ khóa.
- Đổi mật khẩu trong hồ sơ hủy OTP đang chờ.
- Migration V4 bổ sung password_reset_code; cập nhật assertion phiên bản migration và giữ V1–V3 nguyên vẹn.

## Kiểm chứng
- mvn -B verify: **104 tests**, không lỗi hoặc bỏ qua; BUILD SUCCESS.
- 8 test OTP mới: response chung/hash; nhập sai hết lượt; hết hạn và quota gửi; thành công thu hồi phiên/replay; confirm không khớp và đổi mật khẩu hồ sơ; lỗi mail/tắt tính năng; hai confirm cùng lúc; resend thay mã.
- Test email dùng mock, không gửi email thật. Migration V4 được kiểm tra trên H2 PostgreSQL mode; chưa chạy PostgreSQL thực tế trong đợt này.
- Frontend lint không lỗi, còn 4 warning cũ; build qua; bundle đồng bộ Spring Boot.
- Đóng gói lại sau khi thêm biến môi trường PASSWORD_RESET_ENABLED/FROM.
- Log: target/phase1-batch14.log. git diff --check qua.

## Cần người dùng ở bước thử email thật
Xem PASSWORD_RESET_EMAIL.md. Chọn nhà cung cấp, cấu hình SMTP host/port/username/password và địa chỉ gửi đã xác minh, rồi restart backend trên máy. Không gửi secret/OTP vào chat. Tính năng vẫn tắt cho đến khi cấu hình.

## Chưa hoàn tất
- Chưa xác nhận email đến hộp thư thật hoặc E2E trình duyệt.
- Chưa có rate limit IP/tổng; cần ingress limit trước public. Chưa đồng đều thời gian phản hồi email có/không có tài khoản.
- SMTP đồng bộ trong transaction, chưa có outbox. Availability chỉ kiểm tra cấu hình, không probe delivery.
- OTP đăng ký, OTP đổi mật khẩu hồ sơ, OAuth và đa ngôn ngữ còn ở các đợt sau.
- Các yêu cầu còn lại Phase 1 chưa hoàn tất; không coi test mock là bằng chứng gửi email thật.