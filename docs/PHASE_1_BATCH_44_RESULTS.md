# Phase 1 — Batch 44: Lỗi tải Dashboard

Ngày: 2026-10-07

## Thay đổi
- Dùng Promise.allSettled để phân biệt lỗi dashboard, mood và lượt freeze thay vì biến lỗi mood/freeze thành không có dữ liệu.
- Dashboard chính tải lỗi có nút thử lại; mood/freeze lỗi có thông báo riêng Việt/Anh và thử lại.
- Chặn ghi mood khi tải mood thất bại, tránh ghi đè khi người dùng chưa thấy dữ liệu đã lưu.
- Thử lại tải lại cả ba nguồn. Cleanup effect bỏ qua kết quả của lần tải trước khi effect kết thúc hoặc rời trang.

## Kiểm chứng
- Frontend: 38 tests hiện có đạt, build đạt; lint còn 2 cảnh báo fast-refresh cũ. Các tests này chưa mô phỏng UI lỗi mạng.
- Backend không thay đổi; không chạy lại tests. Mốc batch 43: 151 tests thường và 58 PostgreSQL đạt.
- Đã đồng bộ static resources; đóng gói JAR mới.

## Giới hạn
Chưa kiểm thử tương tác lỗi mạng trên trình duyệt thật. Chưa xử lý đầy đủ cạnh tranh giữa thao tác check-in/freeze và tải lại dashboard; chưa thêm E2E. Không deploy.
