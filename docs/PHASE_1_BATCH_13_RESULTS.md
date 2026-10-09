# Phase 1 — Đợt 13: xác nhận mật khẩu mới

Ngày: 26/09/2026. Tiếp tục chức năng theo yêu cầu; để deploy sau.

## Đã thực hiện
- Hồ sơ có ô nhập lại mật khẩu mới, autocomplete phù hợp và giới hạn 8–128 ký tự.
- Frontend kiểm tra khớp trước gửi, chặn nhấn lặp và khóa input trong lúc xử lý.
- API đổi mật khẩu yêu cầu confirmPassword và kiểm tra khớp trước khi sửa hash hoặc thu hồi phiên.
- Giữ hành vi thu hồi mọi phiên sau đổi thành công; giao diện thông báo cần đăng nhập lại.
- Lỗi mất kết nối không bị diễn giải mặc định là sai mật khẩu cũ.
- Không migration mới. Không triển khai lên bản online.

## Kiểm chứng
- mvn -B verify: 96 test qua, không lỗi hoặc bỏ qua; JAR đóng gói thành công.
- Test mới trên H2 thường và H2 qua Flyway: thiếu xác nhận, xác nhận sai và mật khẩu cũ sai không thu hồi phiên; request đúng sau đó thành công.
- Test sẵn có xác nhận cả hai phiên bị thu hồi, mật khẩu cũ không đăng nhập được và mật khẩu mới đăng nhập được.
- Frontend lint không lỗi, còn 4 warning cũ; build qua, static bundle đã đồng bộ.
- git diff --check: qua. Log: target/phase1-batch13.log.
- Không chạy lại PostgreSQL hoặc E2E trình duyệt trong đợt này.

## Lưu ý và phần tiếp theo
- API đổi mật khẩu giờ bắt buộc confirmPassword. Khi cập nhật online cần phát hành frontend và backend cùng nhau; frontend cũ gọi endpoint này sẽ nhận 400.
- Đợt này mới hoàn thành xác nhận cho đổi mật khẩu khi đã đăng nhập. Quên mật khẩu, đăng ký bằng OTP email, OAuth Google/Facebook chưa được hoàn thành.
- Chưa bổ sung OTP cho đổi mật khẩu; đang tiếp tục dùng mật khẩu hiện tại để xác thực.
- Cần hoàn thiện luồng gửi email, thời hạn/số lần thử OTP và kiểm thử trước khi yêu cầu cấu hình nhà cung cấp email thật.