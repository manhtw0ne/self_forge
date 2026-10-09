# Phase 1 — Batch 36: Chống tạo lại bộ thói quen

Ngày: 2026-10-06

## Thay đổi
- Batch nhận requestId UUID tùy chọn để tương thích client trước. Client mới luôn gửi UUID.
- V8 thêm habit_batch_receipt: unique user/request, SHA-256 payload và các ID đã tạo. Receipt và habit cùng transaction, dùng khóa user hiện có.
- Retry cùng mã/payload trả các habit gốc với trạng thái hiện tại; không tạo mới hoặc bật lại habit đã tắt. Cùng mã khác payload trả 409; cùng mã ở tài khoản khác độc lập.
- Frontend lưu payload/mã trong sessionStorage theo user trước khi POST. Có thử lại qua reload cùng tab, giữ payload cũ khi đổi ngôn ngữ, và bỏ yêu cầu chờ có xác nhận. Storage lỗi thì không gửi yêu cầu mới.
- HTTP 400/404/422 xóa yêu cầu chờ; 409, lỗi mạng và lỗi server giữ lại để người dùng xử lý. Client cũ không có requestId vẫn không được bảo vệ khỏi gửi lại.

## Kiểm chứng
- Backend: mvn -B verify đạt 135 tests, không lỗi hoặc bỏ qua sau khi cập nhật mốc migration V8. Kiểm chứng replay, payload khác, không bật lại habit, cách ly tài khoản và schema H2 migration.
- Frontend: 38 tests đạt, build đạt; lint chỉ 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói JAR trong verify.

## Giới hạn
Chưa kiểm thử trình duyệt thật, PostgreSQL và tải đồng thời cho V8 trong đợt này. Không deploy. Storage theo tab không phục hồi khi đóng tab và không đồng bộ thiết bị. Cần giữ receipt để bảo vệ replay, chưa có chính sách dọn receipt. Không tự tạo lại nếu các ID gốc đã bị xóa vật lý.
