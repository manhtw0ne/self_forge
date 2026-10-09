# Phase 1 — Batch 39: Danh mục và điểm khi sửa habit

Ngày: 2026-10-07

## Thay đổi
- PATCH habit thêm clearCategory tùy chọn. true gỡ danh mục; đồng thời gửi categoryId và clearCategory=true trả 400. Bỏ trường này hoặc gửi categoryId=null giữ tương thích PATCH cũ, không tự gỡ danh mục.
- Form sửa gửi clearCategory khi chọn Không chọn; tạo mới không gửi trường này.
- Thay đổi difficulty mà không gửi points sẽ dùng điểm mặc định của độ khó mới. Nếu không đổi difficulty thì giữ điểm hiện có; points gửi tường minh vẫn được giữ theo quy tắc API hiện tại.
- Không sửa snapshot điểm check-in cũ; kiểm thử xác nhận check-in lặp sau đổi độ khó vẫn giữ điểm ban đầu.
- Xóa danh mục riêng dùng khóa user tương ứng với sửa/tạo habit. Nếu còn habit tham chiếu (kể cả inactive), trả 409 và yêu cầu gỡ liên kết trước; không tự xóa habit hoặc lịch sử.

## Kiểm chứng
- Backend: mvn -B verify đạt 145 tests, không lỗi hoặc bỏ qua.
- Frontend: 38 tests hiện có đạt; build đạt; lint còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói JAR mới.

## Giới hạn
Không migration hoặc sửa dữ liệu cũ. Chưa kiểm thử UI trên điện thoại/PostgreSQL trong đợt này; chưa deploy. API vẫn hỗ trợ points tùy chỉnh như trước; cần chốt chính sách điểm giới hạn cho phase companion. Danh mục còn liên kết với habit inactive cần gỡ qua API trước khi xóa vì chưa có màn quản lý habit đã tắt.
