# Phase 1 — Đợt 26: Thao tác thử thách và giới hạn nội dung

Ngày 05/10/2026. Không deploy.

- Khóa đồng bộ bằng ref khi tạo/xóa để chặn gửi lặp trước khi React render trạng thái busy; mở khóa ở finally.
- Vô hiệu hóa biểu mẫu đang gửi, chặn đóng bằng nền/Hủy trong lúc xử lý; giữ dữ liệu nhập khi request lỗi.
- Nút tạo hiển thị trạng thái xử lý, tên được trim trước gửi.
- API giới hạn name/description 255 ký tự phù hợp cột database; frontend maxLength tương ứng. Nội dung vượt giới hạn trả 400.
- Gắn label với control và tên truy cập cho dialog tạo; chưa hoàn thành quản lý focus/Escape/focus trap.

## Kiểm chứng
117 backend tests qua (test mới kiểm tra 256 ký tự bị từ chối và 255 ký tự được chấp nhận, chạy cả cấu hình thường/migration H2). 23 frontend tests qua. Lint không lỗi, 2 warning Fast Refresh cũ; Vite build và Maven verify/package thành công, static bundle đồng bộ. git diff --check qua.
Logs: target/phase1-batch26.log, phase1-batch26-frontend.log, phase1-batch26-lint.log, phase1-batch26-build.log.

Chưa kiểm thử trực tiếp double-click/modal trên trình duyệt; không chạy lại PostgreSQL vì không đổi schema hoặc transaction. PostgreSQL V1–V6 có bằng chứng ở đợt 25.

## Còn mở
Khóa client chỉ chặn request đang bay trong component; chưa bảo đảm idempotent khi timeout/reload/nhiều tab. Challenge cần requestId/pending recovery phía server như Pomodoro, và kiểm thử UI. Không tuyên bố đã giải quyết mọi trường hợp tạo trùng.
