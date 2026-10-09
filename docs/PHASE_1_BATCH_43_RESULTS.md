# Phase 1 — Batch 43: Ghi tâm trạng đồng thời

Ngày: 2026-10-07

## Thay đổi
- MoodService khóa user trong transaction trước khi tìm/tạo mood của ngày; tránh hai request cùng thấy chưa tồn tại rồi tranh unique key.
- Dashboard khóa nút chọn tâm trạng trong khi lưu, dùng ref chống click lặp trước render và aria-pressed cho lựa chọn hiện tại.
- Test bốn request đồng thời, tất cả 200, chỉ một bản ghi ngày và note/score thuộc cùng một lần ghi. Kế thừa chạy trên H2 và PostgreSQL.

## Kiểm chứng
- Backend: 151 tests thường và 58 integration tests PostgreSQL 16.15 đạt, không lỗi hoặc bỏ qua. Ca cạnh tranh ghi mood đạt trên cả hai database.
- Frontend: 38 tests hiện có đạt, lint còn 2 cảnh báo fast-refresh cũ, build đạt.
- Đã đồng bộ static resources và đóng gói lại JAR.

## Giới hạn
Yêu cầu được xử lý sau ghi đè giá trị trước; chưa có version xử lý xung đột giữa thiết bị hoặc đồng bộ realtime. Chưa sửa lỗi tải mood bị hiển thị như chưa ghi nhận khi mạng lỗi. Không deploy.
