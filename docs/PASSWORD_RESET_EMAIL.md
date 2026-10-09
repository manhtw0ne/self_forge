# Email OTP khôi phục mật khẩu

Ngày: 26/09/2026. Chức năng mặc định tắt. Không cần thay cấu hình bản online khi đang phát triển.

## Cấu hình máy chạy backend

Đặt các biến môi trường sau bằng secret manager hoặc phiên shell riêng. Không commit hoặc gửi mật khẩu SMTP vào chat.

| Biến | Giá trị |
| --- | --- |
| PASSWORD_RESET_ENABLED | true |
| PASSWORD_RESET_FROM | Địa chỉ gửi đã được nhà cung cấp xác minh |
| SPRING_MAIL_HOST | SMTP host của nhà cung cấp |
| SPRING_MAIL_PORT | 587 (STARTTLS; theo cấu hình nhà cung cấp) |
| SPRING_MAIL_USERNAME | Tài khoản SMTP |
| SPRING_MAIL_PASSWORD | Secret SMTP hoặc app password |

Ứng dụng bật SMTP auth, STARTTLS bắt buộc và timeout kết nối/đọc/ghi 5 giây. Nếu nhà cung cấp dùng SSL 465 cần cấu hình transport phù hợp, không tắt TLS để né lỗi. Không bật mail debug vì có thể lộ dữ liệu email.

GET /api/auth/password-reset/availability chỉ cho biết tính năng đã bật và có cấu hình sender, không kiểm tra kết nối hay cam kết email đến hộp thư. Chỉ khi enabled=true thì trang đăng nhập mới hiện Quên mật khẩu.

## Luồng API

1. POST /api/auth/password-reset/request với email. HTTP 202 có cùng thông báo cho email tồn tại/không tồn tại hoặc bị hạn mức.
2. POST /api/auth/password-reset/confirm với email, code (chuỗi 6 chữ số), newPassword và confirmPassword (8–128 ký tự).
3. Thành công trả 204, thay hash mật khẩu và thu hồi mọi phiên. Mã được tiêu thụ cùng giao dịch, không dùng lại.
4. Sai/hết hạn/đã dùng mã trả 400 với cùng thông báo chung. Mật khẩu xác nhận không khớp không thay đổi tài khoản.

Mã sinh bằng SecureRandom, chỉ lưu PBKDF2 có salt trong bảng password_reset_code (V4). Hạn 10 phút theo Clock server. Sai tối đa 5 lần/mã; cập nhật số lần sai vẫn commit khi trả lỗi. Gửi lại sau 60 giây, tối đa 3 lần trong cửa sổ 1 giờ cho mỗi tài khoản, và thay thế mã cũ. Mỗi tài khoản chỉ lưu một bản ghi.

Không gửi mail cho địa chỉ chưa đăng ký. SMTP lỗi sẽ hủy mã, giữ hạn mức và trả thông báo chung; log chỉ ghi sự kiện không kèm email/mã. SMTP đồng bộ trong giao dịch có timeout; chưa có outbox/retry nền.

## Kiểm thử gửi thật — cần người dùng thao tác

Sau khi chọn nhà cung cấp, bạn cấu hình các biến trên máy của bạn và restart backend. Dùng email của chính bạn đã đăng ký để thử:
- Nhận email và kiểm tra thư rác.
- Sai mã không đổi mật khẩu; mã mới thay mã cũ.
- Đặt lại thành công, đăng nhập bằng mật khẩu mới và phiên cũ bị từ chối.

Không cần cung cấp secret cho trợ lý. Nếu có lỗi, chia sẻ thông báo đã che địa chỉ/credential, không chia sẻ OTP.

## Giới hạn trước public

- Chưa nghiệm thu gửi email thật hoặc E2E trình duyệt.
- Throttling hiện theo tài khoản, chưa có rate limit tổng/IP ở ứng dụng; cấu hình giới hạn ở ingress trước khi bật public.
- Phản hồi không tiết lộ tài khoản qua nội dung/status, nhưng chưa làm đồng đều thời gian phản hồi.
- Chưa áp dụng OTP cho đăng ký hoặc đổi mật khẩu trong hồ sơ; hai luồng đó vẫn theo hành vi hiện có. Đổi mật khẩu hồ sơ hủy OTP reset đang chờ.
- Hạn mức/bộ đếm bị mất nếu xóa bảng local; không xóa dữ liệu OTP thủ công để vượt giới hạn.
- Database V4 cần áp dụng trước khi chạy backend mới; giữ V1–V3 nguyên vẹn.