# Phase 1 — Đợt 9: chống cộng tiến độ lặp

Ngày: 24/09/2026. Chưa deploy.

## Hành vi

- POST /api/goals/{id}/progress nhận thêm requestId dạng UUID. Cùng goal, mã và amount chỉ có một tác động; khác amount với mã đã dùng trả 409.
- Khóa user, kiểm tra quyền sở hữu, tìm receipt, cập nhật goal và lưu receipt trong cùng giao dịch. Ràng buộc unique (goal_id, request_key) bảo vệ dữ liệu.
- Retry hợp lệ trả trạng thái hiện tại của mục tiêu, không phải bản chụp response cũ; vẫn an toàn sau khi mục tiêu hoàn thành.
- Mã không phân biệt chữ hoa/thường. Mã sai định dạng trả 400. Mã khác là thao tác khác.
- API cũ không gửi requestId vẫn được hỗ trợ và chưa được chống cộng lặp.
- Xóa goal qua API dọn receipts trong cùng giao dịch; goal không tồn tại trả 404, không phát lại thông tin cũ.
- Giao diện tạo mã cho thao tác, chặn nhấn lặp khi đang gửi, giữ mã và số lượng khi lỗi mạng/server để Thử lại. Input khóa trong lúc chờ xác nhận; thành công dùng dữ liệu server và thông báo “Đã lưu tiến độ” thay vì tự suy đoán số lượng được cộng.
- Đóng/mở lại hộp tiến độ trong cùng trang giữ thao tác chưa rõ kết quả.

## Migration và kiểm chứng

- V3__goal_progress_receipt.sql thêm bảng receipt, không sửa V1/V2 hoặc dữ liệu goal hiện có.
- Maven verify: **94 tests**, không failure/error/skipped; BUILD SUCCESS.
- Ba API test mới chạy trên H2 thường và H2 qua Flyway: concurrent retry/cùng mã khác amount; replay sau hoàn thành/ownership/xóa; validation và mã khác nhau.
- Migration tests cập nhật phiên bản 3, kiểm tra nâng cấp từ V1 vẫn giữ dữ liệu check-in cũ và chạy lại không áp dụng thêm migration.
- Frontend lint: 0 lỗi, 4 warning cũ. Vite build qua, bundle đồng bộ vào Spring Boot static và JAR đã đóng gói.
- git diff --check trên file sửa: qua. Log: target/phase1-batch9.log.
- Chưa chạy trình duyệt tương tác hoặc PostgreSQL thực tế trong đợt này.

## Giới hạn

- Mã đang chờ ở frontend chỉ giữ trong bộ nhớ trang; reload/đổi trang sẽ mất mã. Cần lưu hàng đợi theo tài khoản trước khi cam kết retry an toàn xuyên reload/offline.
- Receipt tồn tại đến khi goal bị xóa; chưa có chính sách giới hạn lịch sử. goal_id là tham chiếu logic, đường xóa API dọn receipts; thao tác xóa SQL trực tiếp cần dọn tương ứng.
- Chưa chống request lặp cho tạo goal hoặc mọi API khác.
- Trước public vẫn cần PostgreSQL, E2E mạng chậm/mất kết nối, kiểm thử tải và các mục A1/A2 còn mở.