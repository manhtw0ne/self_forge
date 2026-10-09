# Phase 1 — Batch 35: Tạo thói quen từ mẫu theo giao dịch

Ngày: 2026-10-06

## Đã triển khai
- POST /api/habits/batch nhận 1–10 habit, xác thực tài khoản và validation lồng nhau, không nhận phần tử null.
- Khóa user và dùng một transaction cho cả bộ. Nếu một habit thất bại (gồm quota), toàn bộ bộ tạo được rollback.
- Frontend dùng một yêu cầu thay cho vòng lặp POST; chặn thao tác lặp trong khi chờ, giữ form tạo/sửa khi lỗi, khóa đóng modal khi đang gửi.
- Bổ sung trạng thái lỗi tải/thử lại; chỉ kết quả tải mới nhất cập nhật danh sách. Không hiện empty-state khi lần tải đầu thất bại.
- Chọn template bằng Enter/Space, trạng thái đang gửi. Thông báo Việt/Anh khi chưa xác nhận được kết quả mạng.

## Kiểm chứng
- Backend: mvn -B verify đạt 133 tests, không lỗi hoặc bỏ qua. Test mới xác nhận rollback quota, validation toàn bộ danh sách, tạo thành công, cách ly tài khoản và yêu cầu đăng nhập.
- Frontend: 36 tests hiện có đạt; build đạt; lint chỉ còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói JAR mới.

## Giới hạn
Batch chưa có requestId/receipt chống gửi lại sau timeout hay reload. Giao diện không tự retry POST và yêu cầu kiểm tra danh sách trước khi tạo lại; khóa nút chỉ ngăn thao tác lặp trong cùng trang khi đang gửi. Cần bổ sung idempotency trong đợt tiếp theo. Chưa sửa API reorder, chưa kiểm thử UI thực tế hoặc PostgreSQL đợt này. Không deploy.
