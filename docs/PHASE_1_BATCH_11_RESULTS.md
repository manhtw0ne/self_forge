# Phase 1 — Đợt 11: kiểm chứng PostgreSQL và CI frontend

Ngày: 24/09/2026. Chạy local bằng PostgreSQL tạm trong Testcontainers, không kết nối database production, không deploy.

## Kết quả

- Khởi động Docker Desktop đã cài sẵn; chạy mvn -B -Ppostgres-tests verify thành công.
- **94 test backend thông thường + 38 integration test PostgreSQL 16.15**: không failure/error/skipped.
- **8 test frontend** qua npm --prefix frontend test.
- Kiểm chứng trên PostgreSQL: schema V1–V3 từ trống, nâng cấp giữ dữ liệu cũ, Hibernate validate, khởi động lại giữ dữ liệu, migration không chạy lại và từ chối tự baseline schema cũ.
- Các test API kế thừa xác nhận quyền sở hữu, XP/check-in, quota freeze/habit/goal đồng thời, streak dài và retry tiến độ trên PostgreSQL thực tế.
- Sửa assertion đếm migration sau restart từ 2 thành 3 để khớp V3.
- Thêm npm test cho frontend và đưa lệnh này vào CI trước build, tránh bỏ sót test ngày/múi giờ và dữ liệu chờ tiến độ.
- git diff --check trên file sửa: qua.
- Log: target/phase1-batch11-postgres.log; báo cáo chi tiết: target/failsafe-reports và target/surefire-reports.
- Docker Desktop đã được khởi động và giữ chạy; container test do Testcontainers quản lý.

## Phạm vi nghiệm thu

Đây là bằng chứng kiểm thử các luồng hiện có trên PostgreSQL, thay thế giới hạn “chưa chạy PostgreSQL” của các báo cáo đợt 1–10 cho bộ test hiện tại. Không đồng nghĩa toàn bộ Phase 1 hoàn tất hoặc đủ sức phục vụ 100 người dùng.

Còn cần:
- E2E trình duyệt/điện thoại cho reload, mất kết nối, phiên đăng nhập và thao tác UI.
- Load test, backup/restore và staging thật.
- Hoàn thiện chính sách check-in bù, lịch ngày nghỉ, vòng đời Pomodoro và đối soát dữ liệu legacy.
- Workflow deploy hiện chạy trực tiếp khi push main, chưa có điều kiện chờ workflow Verify thành công; cần thêm cổng kiểm thử trước phát hành. Đợt này chưa thay đổi trigger deploy, chưa push hoặc deploy.