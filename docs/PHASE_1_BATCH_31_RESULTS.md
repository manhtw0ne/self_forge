# Phase 1 — Đợt 31: Gộp giao diện tài khoản, phần thưởng, lịch nhắc và xuất dữ liệu

Ngày 06/10/2026. Không deploy. Gộp nhiều hạng mục theo yêu cầu tăng tiến độ.

## Phạm vi thực hiện
1. Rewards: Việt/Anh cho XP, level, phạt, huy hiệu hệ thống và phần thưởng tự đặt; giữ nguyên dữ liệu tự nhập. Thông báo lỗi tải phần thưởng riêng; lỗi tải chính có thử lại.
2. Rewards: khóa thao tác tạo/nhận/xóa khi request đang bay, khóa form và chặn đóng modal khi tạo, giới hạn tên/mô tả 255 và XP 1–1.000.000 theo API.
3. Reminders: Việt/Anh cả thứ trong tuần; trạng thái tải/lỗi/thử lại; khóa tạo/bật/tắt/xóa; giữ nội dung khi lỗi; không cho gửi lịch không chọn ngày; aria-pressed cho chọn ngày.
4. Nhắc nhở hiển thị rõ chỉ lưu lịch, chưa gửi notification thiết bị. Không coi CRUD lịch là đã hoàn thành Web Push.
5. Backend reminder: validate mã ngày MON–SUN, cấu trúc danh sách, tối đa 27 ký tự và message tối đa 255 cho create/update. Null vẫn hỗ trợ default hoặc partial update.
6. Profile: Việt/Anh cho hồ sơ, mật khẩu, export và thông báo; khóa submit hồ sơ/export chống click lặp; lỗi tải thống kê có thử lại. PATCH thành công nhưng refreshUser lỗi không bị báo thành lỗi lưu.
7. Bỏ nhãn UTC cố định của New York/London vì thay đổi theo DST; vẫn giữ nguyên giá trị IANA.
8. Export CSV: trung hòa tiền tố công thức =,+,-,@ cả khi có khoảng trắng/control/BOM phía trước; giữ escape dấu nháy và Unicode.
9. Export check-in đúng 90 ngày gồm hôm nay (today-89 đến today), trước đây truy vấn inclusive today-90 trả 91 ngày.

## Kiểm thử mới
- CsvTextTests: công thức, tiền tố whitespace/control, Unicode, dấu nháy, newline, null.
- API reminder: ngày rỗng/không hợp lệ, message quá dài bị từ chối; lịch hợp lệ tạo được; PATCH rỗng bị từ chối.
- API export: dữ liệu tên habit dạng công thức được bảo vệ; today-90 bị loại, today-89 được xuất.
- Frontend: thông báo XP/huy hiệu có tham số, thứ trong tuần và lỗi phần thưởng bằng Việt/Anh; kiểm tra placeholder toàn bộ catalog.

## Giới hạn
Chưa nghiệm thu UI trên điện thoại/trình duyệt; không tuyên bố đạt accessibility đầy đủ. Khóa giao diện không thay thế requestId phía server cho tạo reward/reminder khi timeout. Chưa làm Web Push, OAuth, thanh toán hoặc xóa tài khoản trong đợt này. Trang Premium, email và toàn bộ lỗi backend chưa được dịch hết; CSV vẫn có tiêu đề tiếng Việt. Export hiện không phải bản sao đầy đủ mọi module. Không bảo đảm an toàn nếu người dùng sửa/mở và lưu lại CSV bằng công cụ tự bỏ ký tự bảo vệ.

## Lỗi phát hiện thêm qua test tích hợp
CSV với check-in có thể ném LazyInitializationException khi đọc tên habit vì persistence context đã đóng. Bổ sung transaction chỉ đọc cho API export để các quan hệ lazy còn truy cập được trong lúc ghi CSV. Test API mới tái hiện và kiểm chứng lỗi này, ngoài kiểm tra công thức và ranh giới ngày.

## Kết quả cuối
- mvn -B verify: 127 backend tests, không lỗi/bỏ qua; bao gồm các test API mới trên cấu hình thường và migration H2. Đóng gói thành công với static bundle mới.
- 32 frontend tests qua; lint không lỗi, còn 2 warning Fast Refresh cũ; Vite build qua; git diff --check qua.
- Lượt PostgreSQL không chạy được vì Testcontainers không tìm thấy Docker engine. Đã thử khởi động Docker Desktop nhưng engine chưa sẵn sàng; không ghi nhận PostgreSQL pass cho đợt này. Không có migration mới (vẫn V7).
- Log: target/phase1-batch31-local.log, phase1-batch31-postgres.log (lỗi môi trường), phase1-batch31-frontend.log, phase1-batch31-lint.log, phase1-batch31-build.log.
- Chưa deploy và chưa kiểm thử giao diện trên thiết bị thật.
