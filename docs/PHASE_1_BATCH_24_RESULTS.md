# Phase 1 — Đợt 24: Kiểm thử bắt đầu Pomodoro đồng thời

Ngày 05/10/2026. Không deploy.

- Thêm test 6 yêu cầu start cùng mã chạy qua executor với cổng bắt đầu chung: tất cả trả cùng sessionId và database chỉ có 1 phiên.
- Kiểm tra tài khoản khác dùng cùng requestId nhận phiên riêng.
- Test nằm trong ProductionSafetyTests, được kế thừa bởi MigrationSchemaTests và PostgresMigrationIT.
- Sửa assertion số migration sau restart PostgreSQL từ 5 thành 6; assertion này bị bỏ sót khi thêm V6.

## Kiểm chứng
mvn -B verify: 115 tests, 0 failures/errors/skipped; build/package thành công. git diff --check qua. Log: target/phase1-batch24-local.log. Frontend không đổi, không chạy lại frontend tests.

## Chưa hoàn tất
Chưa chạy được PostgreSQL V4–V6: Docker Desktop đã được khởi động nhưng thoát, Linux engine không có pipe hoạt động. Lượt chạy profile postgres đầu bị dừng trong bước test local vì tiến trình sandbox không tiến triển; sau đó bộ test local chạy lại ngoài sandbox thành công. Không coi đây là PostgreSQL pass.

Người dùng cần mở Docker Desktop và chờ Engine running. Sau đó chạy mvn -B -Ppostgres-tests verify để kiểm chứng migration mới, restart và bộ test đồng thời trên PostgreSQL. Chưa xác nhận email thật hoặc UI trên điện thoại.
