> Cập nhật 20/09/2026: đã bổ sung Flyway V1 và bộ kiểm thử migration. Các nhận định “chưa có migration” bên dưới là lịch sử đánh giá 16/09; xem [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) cho trạng thái mới.

# Đánh giá sẵn sàng production — 2026-09-16

## Kết luận trước nâng cấp

Chưa sẵn sàng mở public hoặc thu tiền. Có nhiều tính năng nhưng số lượng tính năng không chứng minh độ tin cậy. Không có dữ liệu analytics, database production hay bằng chứng người dùng hoạt động trong repository; chưa xác minh có người dùng thật.

| Mức | Phát hiện từ code | Hậu quả |
| --- | --- | --- |
| P0 | `/api/premium/activate` cho user tự chọn tier | Tự cấp quyền trả phí |
| P0 | ProfileController thiếu transaction/save | Đổi hồ sơ, mật khẩu có thể không lưu |
| P1 | Logout chỉ xóa localStorage | Token cũ còn sử dụng được |
| P1 | Mật khẩu đăng ký cho phép null, đổi mật khẩu thiếu validation | Lỗi 500 hoặc mật khẩu yếu |
| P1 | Claim reward không có transaction/khóa | Nhận lại thưởng, sai số dư |
| P1 | Prod dùng ddl-auto:update, thiếu quy trình migration/restore | Rủi ro thay đổi dữ liệu |
| P1 | Chỉ hai test, dependency test nằm trong profile | Build mặc định thiếu kiểm chứng |
| P2 | API frontend thiếu timeout và proxy local | Treo request, khó chạy frontend riêng |

## Điều kiện mở public còn phải chứng minh

- Chạy PostgreSQL staging và migration có version, diễn tập backup/restore.
- Rate limit đăng nhập/đăng ký tại ingress; không tin header IP do client tự gửi.
- Kiểm tra đồng thời check-in, XP, freeze, quota; thống nhất ngày theo timezone user (nhiều service còn dùng LocalDate.now()).
- Email xác minh/khôi phục mật khẩu, quy trình xóa tài khoản và chính sách lưu dữ liệu.
- Kiểm thử trình duyệt/mobile, accessibility, tải và kiểm tra dependency vulnerabilities.
- Dashboard vận hành, cảnh báo lỗi, kiểm tra uptime; không log token/mật khẩu/nội dung nhật ký.
- Trước bán Premium: webhook thanh toán có chữ ký, chống replay, hoàn tiền và hết hạn.
- Pilot có đồng ý của 5–10 người: đo đăng ký → tạo habit → check-in, quay lại ngày 7, thu phản hồi.

Đây là đánh giá repository, không phải chứng nhận bảo mật hay bằng chứng deploy thành công.
