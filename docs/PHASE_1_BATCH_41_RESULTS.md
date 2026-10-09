# Phase 1 — Batch 41: Kiểm chứng PostgreSQL sau batch 40

Ngày: 2026-10-07

## Phạm vi
Chạy mvn -B -Ppostgres-tests verify với Docker đang hoạt động. Dùng database Testcontainers riêng, không kết nối hoặc sửa database production, không deploy.

Bộ integration kế thừa ProductionSafetyTests và bổ sung startup/restart production, migration không chạy lại, không tự baseline schema cũ. Phạm vi hồi quy gồm receipt batch habit V8, phân quyền danh mục, sửa điểm/danh mục, reorder, khôi phục habit, phiên đăng nhập và các ca đồng thời có sẵn.

## Kết quả
- 147 kiểm thử backend thông thường đạt.
- 56 kiểm thử tích hợp trên PostgreSQL 16.15 đạt; không lỗi, không bỏ qua.
- Flyway V1–V8 được xác thực; startup/restart production giữ dữ liệu và không chạy lại migration đã áp dụng.
- BUILD SUCCESS; JAR được đóng gói. Không đổi frontend nên không chạy lại kiểm thử frontend (mốc gần nhất: 38 tests đạt ở batch 40).

## Giới hạn
Không thay thế kiểm thử E2E trên trình duyệt/điện thoại, tải 100 người dùng, SMTP/OAuth/thanh toán thật hoặc backup/restore. Chưa có ca cạnh tranh đồng thời riêng cho batch habit V8 và reorder; không suy ra chúng đã được kiểm thử chỉ từ việc các ca khác chạy đồng thời.
