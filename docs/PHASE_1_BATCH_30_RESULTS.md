# Phase 1 — Đợt 30: Bản nháp nhật ký trong tab

Ngày 06/10/2026. Không deploy.

- Ghi bản nháp đồng bộ mỗi lần sửa vào sessionStorage theo userId/ngày; không phụ thuộc effect trước khi rời trang.
- Reload/quay lại trang/đổi ngày trong cùng tab phát hiện bản nháp, cho người dùng khôi phục hoặc xóa. Không tự gửi nội dung lên server, không tự thay bản server.
- Khi đang chọn xử lý bản nháp, khóa form để tránh vô tình ghi đè. Sau khi restore có thể chỉnh sửa và chủ động lưu.
- Lưu server thành công mới xóa draft; lỗi lưu giữ bản nháp. Lỗi storage hiển thị rõ, không báo đã giữ nháp.
- Nếu đã giữ nháp thành công, đổi ngày không cần bỏ nội dung; khi storage lỗi vẫn hỏi trước khi rời ngày.
- Thông báo Việt/Anh phân biệt bản nháp trong tab với bài đã lưu server.

## Kiểm chứng
31 frontend tests qua; hai test mới xác nhận khôi phục Unicode, tách tài khoản/ngày, xóa đúng draft, JSON hỏng và storage lỗi. Lint không lỗi, 2 warning Fast Refresh cũ. Vite build và Maven package qua; static bundle đồng bộ, git diff --check qua. Backend không đổi, không chạy lại backend/PostgreSQL.
Logs: target/phase1-batch30-frontend.log, phase1-batch30-lint.log, phase1-batch30-build.log, phase1-batch30-package.log.

## Giới hạn
Chưa có E2E trên trình duyệt/điện thoại. sessionStorage không bảo đảm sau đóng tab, xóa dữ liệu trình duyệt hoặc trên thiết bị khác; không phải backup server. Bản nháp ở dạng văn bản trong bộ nhớ phiên trình duyệt, không mã hóa riêng; vẫn còn theo tài khoản trong tab sau logout. Không đồng bộ/xử lý xung đột nhiều thiết bị. Router nội bộ chưa có cảnh báo riêng khi storage lỗi; beforeunload chỉ hỗ trợ reload/đóng tab tùy trình duyệt. Không tự gửi nhật ký sang AI.
