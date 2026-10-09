# Phase 1 — Đợt 10: khôi phục tiến độ chờ sau reload

Ngày: 24/09/2026. Thay đổi frontend; không migration mới, không deploy.

## Đã thực hiện

- Lưu thao tác trước khi POST vào localStorage theo user ID và requestId. Dữ liệu chỉ gồm goalId, amount và requestId; không lưu tên mục tiêu, nhật ký hoặc token trong receipt.
- Reload, chuyển trang rồi quay lại, đăng nhập lại cùng tài khoản vẫn tìm được thao tác chưa xác nhận. Tài khoản khác đọc vùng dữ liệu riêng.
- Khu vực “Tiến độ chờ xác nhận” cho phép thử lại kể cả goal đã hoàn thành hoặc không còn trong danh sách. Không tự gửi lại trong nền.
- Retry dùng nguyên mã và số lượng; input bị khóa khi xác nhận thao tác cũ. Server tiếp tục chống cộng trùng bằng V3.
- Thành công dọn đúng thao tác; HTTP 400/404/409/422 là từ chối xác định và dọn thao tác. Lỗi mạng, 401/403, 408, 429 và 5xx giữ nguyên để thử lại.
- Nếu không thể đọc/ghi localStorage hoặc phát hiện dữ liệu chờ hỏng, không tạo request mới. Nếu đã thành công ở server nhưng dọn localStorage thất bại, retry vẫn dùng mã cũ.
- Theo dõi storage event để cập nhật danh sách chờ khi tab khác thay đổi.
- Bổ sung xử lý lỗi tải danh sách mục tiêu.

## Kiểm chứng

- node --test frontend/src/utils/dates.test.js frontend/src/utils/pendingProgress.test.js: **8 tests qua**, gồm 6 test mới cho phục hồi, cách ly tài khoản, dữ liệu hỏng, hết dung lượng và phân loại lỗi retry.
- Lint không lỗi, còn 4 warning cũ ngoài file sửa; Vite build qua.
- Bundle đồng bộ vào Spring Boot static; mvn -B -DskipTests package BUILD SUCCESS.
- Backend không đổi; không chạy lại 94 backend tests đã qua ở đợt 9. Không gộp số này vào số test chạy đợt 10.
- Chưa chạy E2E trình duyệt để mô phỏng timeout/reload/login; chưa xác nhận trải nghiệm trực tiếp trên điện thoại.
- Log đóng gói: target/phase1-batch10-package.log.

## Giới hạn còn lại

- Xóa dữ liệu trình duyệt, dùng thiết bị khác hoặc chế độ riêng tư kết thúc sẽ mất dữ liệu chờ cục bộ; đây chưa phải đồng bộ offline nhiều thiết bị.
- Hai tab khởi tạo thao tác mới cùng lúc vẫn có thể tạo hai mã khác nhau và được tính như hai thao tác. Storage event không phải khóa liên tab.
- Dữ liệu chờ được giữ qua logout để phục hồi khi đăng nhập lại cùng tài khoản; localStorage không phải kho dữ liệu mã hóa.
- Chưa có giao diện đối soát dữ liệu localStorage hỏng. Không tự xóa mã không đọc được vì có thể đã có tác động ở server.
- PostgreSQL/E2E và các mục A1/A2 vẫn cần nghiệm thu trước public.