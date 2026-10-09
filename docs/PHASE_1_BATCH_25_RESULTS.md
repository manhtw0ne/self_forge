# Phase 1 — Đợt 25: PostgreSQL V1–V6 và trang Thử thách

Ngày 05/10/2026. Không deploy.

## Kiểm chứng PostgreSQL
Docker engine đã hoạt động; gọi Docker ngoài sandbox giải quyết lỗi quyền named pipe.
- mvn -B -Ppostgres-tests verify thành công: 115 test thường và 41 PostgresMigrationIT, không lỗi hoặc bỏ qua.
- Xác nhận Flyway V1–V6, schema validate, upgrade từ V1 và giữ dữ liệu khi restart; migration chạy lại không phát sinh thêm.
- Test 6 start Pomodoro cùng key trả một phiên và cùng key ở tài khoản khác trả phiên riêng đã qua trên PostgreSQL 16.15.
- Không đồng nghĩa đã kiểm thử gửi email thật; các luồng SMTP/OTP vẫn cần nghiệm thu riêng.

## Thử thách
- Việt/Anh cho danh sách, biểu mẫu, trạng thái, xác nhận xóa và thông báo thao tác.
- Ngày theo ngôn ngữ, giữ nguyên tên và mô tả người dùng.
- Lỗi danh sách không bị hiển thị như danh sách rỗng; có nút thử lại.
- Lỗi tải tiến độ từng thử thách hiển thị riêng và có nút thử lại, không âm thầm ẩn lỗi.
- Lint giới hạn src và vite.config.js: lần chạy mặc định đã quét cả node_modules trên môi trường hiện tại; sửa phạm vi để kiểm tra code ứng dụng.

## Kiểm chứng frontend
23 tests qua, gồm kiểm tra placeholder catalog mới. Lint không lỗi, 2 warning Fast Refresh cũ. Vite build, package JAR và git diff --check qua. Static bundle đồng bộ.
Logs: target/phase1-batch25-postgres.log, phase1-batch25-frontend.log, phase1-batch25-lint.log, phase1-batch25-build.log, phase1-batch25-package.log.

Chưa kiểm thử tương tác trực tiếp trên trình duyệt/điện thoại. Còn chống gửi tạo challenge lặp, accessibility modal và các trang chưa dịch. Pomodoro còn pause/cancel server và khôi phục đa thiết bị.
