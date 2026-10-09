# Phase 1 — Batch 40: Quản lý thói quen đã tắt

Ngày: 2026-10-07

## Thay đổi
- GET /api/habits/inactive trả habit đã tắt của tài khoản hiện tại; mặc định GET /api/habits vẫn chỉ trả active.
- Trang Thói quen có hai trạng thái Đang bật/Đã tắt và số lượng, hỗ trợ lọc danh mục, xem/sửa habit cũ và bật lại.
- Bật lại dùng PATCH active=true với khóa user/quota có sẵn; không tạo habit mới, không xóa check-in. UI chờ server, khóa thao tác lặp và tải lại sau lỗi.
- Có thể sửa habit đã tắt để gỡ danh mục, giải quyết hạn chế giao diện ở batch 39. Nút sắp xếp chỉ xuất hiện trong danh sách đang bật.
- Nội dung Việt/Anh và nhãn trạng thái aria-pressed.

## Kiểm chứng
- Backend: mvn -B verify đạt 147 tests, không lỗi hoặc bỏ qua. Kiểm thử mới xác nhận cách ly inactive theo tài khoản, auth, quota, retry khôi phục và giữ ghi chú check-in.
- Frontend: 38 tests hiện có đạt; build đạt; lint còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói lại JAR mới.

## Giới hạn
Chưa phân trang inactive, chưa có UI quản lý/xóa danh mục riêng hoặc xóa habit vĩnh viễn. Chưa kiểm thử giao diện thiết bị thật/PostgreSQL trong đợt này. Không deploy.
