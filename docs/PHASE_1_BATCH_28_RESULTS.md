# Phase 1 — Đợt 28: Xóa Thử thách có thể thử lại

Ngày 05/10/2026. Không deploy.

## Thay đổi
- DELETE challenge lấy user từ phiên, khóa user và truy vấn bằng cả id/userId.
- Không có challenge thuộc user hiện tại: trả 204 và không thay đổi dữ liệu. Áp dụng cả ID đã xóa/không tồn tại/thuộc tài khoản khác để không tiết lộ sự tồn tại của dữ liệu người khác.
- Challenge còn tồn tại thuộc user hiện tại: xóa trong transaction. Retry và nhiều yêu cầu đồng thời đều đạt trạng thái cuối đã xóa.
- Yêu cầu chưa đăng nhập vẫn bị từ chối. GET progress của challenge đã xóa vẫn trả 404.
- Không thay schema hoặc frontend; giao diện đã giữ hộp xác nhận khi lỗi mạng nên người dùng có thể bấm xóa lại. Không thêm tự động retry hoặc tự xóa khi mở lại trang.

## Kiểm thử bổ sung
Tạo challenge bằng API cũ không có requestId; từ chối delete chưa đăng nhập; delete bằng tài khoản khác không ảnh hưởng bản ghi; bốn delete đồng thời đều 204; retry tiếp vẫn 204; kiểm tra GET và database xác nhận bản ghi đã mất. Bộ test kế thừa chạy trên cấu hình thường, migration H2 và PostgreSQL.

## Giới hạn
Chưa kiểm thử tương tác mất phản hồi DELETE trên trình duyệt/điện thoại. Không lưu thao tác xóa chờ qua reload; danh sách tải lại từ server phản ánh trạng thái hiện tại. Chưa thay hành vi các endpoint xóa khác.

## Kết quả
mvn -B -Ppostgres-tests verify thành công: 121 backend tests thường và 44 PostgreSQL integration tests, không lỗi/bỏ qua. PostgreSQL 16.15, V1–V7 validate/restart qua. JAR đóng gói trong verify. git diff --check qua. Frontend không đổi, không chạy lại 26 frontend tests từ đợt 27. Log: target/phase1-batch28-postgres.log.
