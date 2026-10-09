# Phase 1 — Đợt 29: Bảo vệ nội dung nhật ký khi tải và lưu

Ngày 05/10/2026. Không deploy.

- Chỉ 404 nhật ký được coi là ngày chưa có bài viết. Lỗi mạng/401/5xx hiển thị lỗi và thử lại, không mở form trống cho phép ghi đè bài cũ.
- Bộ kiểm soát request chỉ cho phản hồi mới nhất cập nhật form, lỗi và trạng thái loading; vô hiệu hóa callback cũ khi chuyển ngày/unmount.
- Khóa lưu bằng ref và disabled fieldset, chặn đổi ngày khi POST đang chạy; giữ nội dung nếu lưu lỗi.
- Hỏi xác nhận bỏ chỉnh sửa khi đổi ngày. beforeunload cảnh báo reload/đóng tab theo khả năng trình duyệt.
- Lỗi danh sách ngày có thông báo và nút thử lại riêng. Tách component theo user để không mang state sang tài khoản khác.
- Thông báo mới có Việt/Anh.

## Kiểm chứng
29 frontend tests qua. Ba test mới kiểm tra response cũ không ghi đè ngày mới, bỏ callback sau unmount/invalidate và lỗi hiện tại giải phóng loading. Lint không lỗi, còn 2 warning Fast Refresh cũ. Vite build, Maven package và git diff --check qua; static bundle đồng bộ. Logs: target/phase1-batch29-frontend.log, phase1-batch29-lint.log, phase1-batch29-build.log, phase1-batch29-package.log.

Backend không đổi, không chạy lại bộ test backend/PostgreSQL. Chưa có E2E tương tác trên trình duyệt/điện thoại.

## Giới hạn
Chưa lưu nháp nhật ký vào storage; chuyển trang nội bộ qua menu/back của router chưa có chặn bỏ thay đổi. beforeunload không bảo đảm trên mọi thiết bị mobile. Chưa xử lý xung đột hai thiết bị cùng sửa một ngày hoặc versioning phía server. Không tuyên bố đã bảo vệ mọi tình huống mất nội dung.
