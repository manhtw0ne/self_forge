# Phase 1 — Đợt 27: Tạo Thử thách có thể thử lại an toàn

Ngày 05/10/2026. Không deploy.

## Backend
- CreateChallengeRequest nhận UUID requestId tùy chọn để tương thích client cũ. Chỉ request có key được bảo đảm chống tạo trùng.
- Khóa theo user; receipt unique(user_id, request_id), fingerprint SHA-256 của habit/name/description/startDate/targetDays. Cùng key và payload trả resource cũ; đổi payload trả 409.
- Không tính ngày hiện tại vào fingerprint khi startDate null, tránh đổi ngày làm retry tạo mới hoặc bị xung đột.
- Migration V7 lưu receipt tách khỏi challenge, giữ receipt khi xóa challenge. Retry sau xóa trả 409, không hồi sinh tài nguyên. Receipt xóa theo user; chưa có API xóa tài khoản đầy đủ.
- Delete dùng cùng khóa user để phối hợp với create/replay. Không thay quy tắc tiến độ hoặc XP.

## Frontend
- Lưu yêu cầu vào sessionStorage theo tài khoản trước POST; dùng nguyên payload và key khi thử lại, kể cả sau reload trong cùng tab.
- Banner pending chặn mở form tạo mới và cho phép thử lại; form đang nhập giữ trong state khi lỗi. Remount theo user tránh mang state giữa tài khoản.
- 400/404/422 bỏ pending, 401/403/408/409/429/5xx/network giữ lại. Dữ liệu hỏng chặn gửi; có thao tác bỏ bản lưu với xác nhận rõ có thể đã tồn tại thử thách trên server.
- Đổi ngôn ngữ không thay dữ liệu nhập/payload; thông báo mới có Việt/Anh.

## Kiểm chứng
- 119 backend tests thường + 43 PostgreSQL integration tests qua trên PostgreSQL 16.15, không lỗi/bỏ qua.
- Test mới: 4 create đồng thời, payload conflict, replay bản ghi có ngày khác, replay sau delete không tạo lại, cùng key ở user khác.
- V1–V7 migrate/validate/restart qua. 26 frontend tests qua, gồm timeout/reload giữ đúng payload, phân loại lỗi và storage hỏng.
- Lint không lỗi, 2 warning Fast Refresh cũ; Vite build và package thành công, static bundle đồng bộ; git diff --check qua.
- Logs: target/phase1-batch27-postgres.log, phase1-batch27-frontend.log, phase1-batch27-lint.log, phase1-batch27-build.log, phase1-batch27-package.log.

## Giới hạn
Chưa có E2E trên trình duyệt/điện thoại. sessionStorage không đồng bộ qua thiết bị/tab; hai thao tác độc lập có key khác vẫn được tạo hai challenge. Chưa xử lý luồng xóa retry thành công khi server đã xóa nhưng response mất; chưa hoàn tất quản lý focus modal. Receipt hiện giữ vô thời hạn để tránh replay, cần đưa vào chính sách lưu giữ/export/xóa tài khoản.
