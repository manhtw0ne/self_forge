# Phase 1 — Đợt 23: Giải quyết yêu cầu Pomodoro chờ bị lỗi

Ngày 27/09/2026. Không deploy.

- Tách helper gửi start: đọc/kiểm tra UUID, habitId và duration 25 phút của UI; lưu trước gửi; dùng lại đúng payload sau timeout/reload.
- Lỗi 400/404/422 xóa pending để cho phép sửa lựa chọn và bắt đầu lại. Lỗi 401/403/408/429/5xx, mất mạng giữ pending. 409 giữ pending vì có thể liên quan phiên đã tồn tại.
- JSON hỏng hoặc payload sai bị chặn trước khi gửi. Sau khi thử lại, UI hiện lựa chọn bỏ bản lưu cục bộ cho dữ liệu hỏng/409, có xác nhận và giải thích không xóa phiên server.
- Không gửi request nếu ghi storage thất bại. Giữ pending sau response thành công tới khi ghi timer và xóa pending hoàn tất.
- Thông báo mới có Việt/Anh.

## Kiểm chứng
23 frontend tests qua; 4 test mới kiểm tra timeout/reload dùng cùng payload, phân loại 10 HTTP status, dữ liệu hỏng không gửi mạng và storage lỗi không gửi request. Lint không lỗi, còn 2 warning Fast Refresh cũ. Vite build, Maven package và git diff --check qua; static đã đồng bộ. Log: target/phase1-batch23-package.log.

Backend không đổi; không chạy lại 113 backend tests đợt 22. Chưa kiểm thử tương tác UI trên trình duyệt hoặc PostgreSQL V4–V6. Test helper mô phỏng mạng không thay thế E2E.

## Tiếp theo
Kiểm thử đồng thời và migration trên PostgreSQL, kiểm thử UI khi mất mạng/reload; tiếp tục vòng đời pause/cancel server và khôi phục khác tab/thiết bị. Pomodoro chưa đạt toàn bộ cổng public.
