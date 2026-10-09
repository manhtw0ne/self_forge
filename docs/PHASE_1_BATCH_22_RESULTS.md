# Phase 1 — Đợt 22: Bắt đầu Pomodoro có thể thử lại

Ngày 27/09/2026. Không deploy.

- API start nhận UUID requestId tùy chọn; khóa user, tra lại phiên theo user/requestId, trả phiên cũ nếu payload khớp và trả 409 nếu thay duration/habit.
- Migration V6 thêm start_request_id và unique index theo user. Request không có key vẫn tương thích client cũ nhưng không được bảo đảm idempotent.
- Frontend lưu payload trước POST trong sessionStorage theo tài khoản; giữ payload khi lỗi, thử lại bằng cùng key. Chặn đổi mode/habit/reset khi request đang chờ xác nhận.
- Khi khôi phục, dùng startedAt từ server để tính thời gian còn lại. Lưu trạng thái timer trước khi xóa pending request. Phiên đã được server hoàn thành không nhận thêm XP.
- Thông báo trạng thái chờ có Việt/Anh.

## Kiểm chứng
113 backend tests qua (gồm test retry/payload conflict chạy trên cấu hình thường và migration H2); 19 frontend tests qua. Lint không lỗi, còn 2 warning cũ. Vite build và đóng gói thành công, static bundle đồng bộ. Logs: target/phase1-batch22.log và target/phase1-batch22-package.log.

Lần chạy đầu thất bại do script sửa file bị lỗi encoding giữa chừng; đã sửa đầy đủ và chạy lại verify thành công. Chưa chạy PostgreSQL thực tế V4–V6 hoặc kiểm thử tương tác trình duyệt; chưa có test đồng thời riêng cho start mới.

## Còn mở
- Pending hỏng hoặc payload bị server từ chối dứt điểm hiện được giữ lại để tránh tự tạo phiên khác; cần luồng hủy/giải quyết rõ ràng.
- sessionStorage chỉ phạm vi tab/tài khoản; không phục hồi trên thiết bị khác hoặc khi xóa dữ liệu trình duyệt.
- Pause/cancel chưa có vòng đời server; chưa hoàn thành nghiệm thu Pomodoro public.
- Tiếp theo: xử lý lỗi dứt điểm/pending hỏng, kiểm tra đồng thời PostgreSQL và tích hợp UI mất mạng/reload.
