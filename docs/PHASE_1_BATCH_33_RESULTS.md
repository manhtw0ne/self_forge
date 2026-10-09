# Phase 1 — Batch 33: Đồng bộ phiên trên trình duyệt

Ngày: 2026-10-06

## Thay đổi
- Phản hồi 401 chỉ xóa token khi token gửi trong yêu cầu trùng token hiện lưu. Phản hồi chậm từ phiên cũ không thể xóa phiên mới.
- Giữ ngoại lệ cho login/register/logout; lỗi mạng hoặc 500 không đăng xuất người dùng.
- Tab khác đăng nhập/đăng xuất sẽ kích hoạt tải lại trang, xóa state tài khoản cũ trong bộ nhớ. Thao tác này có thể ngắt nội dung chưa lưu; nhật ký đã có cơ chế bản nháp riêng.
- Bỏ việc xóa token không kiểm tra ở bước khởi tạo AuthProvider; giao cho interceptor xử lý thống nhất.
- Thêm 3 kiểm thử cho token cũ/mới, lỗi không liên quan xác thực và AxiosHeaders.

## Kiểm chứng
- Frontend: 35 tests đạt, build đạt; lint còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources. Không deploy.
- Backend: mvn -B verify đạt 129 tests, không lỗi hoặc bỏ qua; bao gồm kiểm thử quản lý phiên của batch 32.

## Giới hạn
Đồng bộ dựa trên storage event trong cùng origin/trình duyệt. Thu hồi từ thiết bị khác được phát hiện khi có yêu cầu API tiếp theo; chưa có push hoặc polling phiên. Chưa kiểm thử tương tác nhiều tab trên trình duyệt thật, chưa chạy lại PostgreSQL.
