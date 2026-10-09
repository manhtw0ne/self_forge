# Phase 1 — Đợt 6: streak dài và ngày check-in

Ngày: 24/09/2026. Tiếp tục Phase 1/A2 tại Desktop/projects/self_forge. Chưa deploy.

## Đã thực hiện

- Dashboard, huy hiệu và căn cứ phạt dùng chung StreakService.
- Bỏ giới hạn lịch sử khoảng 100 ngày. Đọc từng cửa sổ 128 ngày, mỗi cửa sổ hai truy vấn có phạm vi user/habit; dừng khi gặp khoảng trống. Không truy vấn freeze riêng từng ngày.
- Ngày hoàn thành cộng một ngày streak. Ngày freeze giữ chuỗi nhưng không cộng số ngày; nếu vừa hoàn thành vừa freeze vẫn chỉ cộng một lần.
- Ngày đang xem chưa có check-in được chờ đến hết ngày: có thể hiển thị chuỗi kết thúc hôm qua. FAILED/SKIPPED không được hưởng khoảng chờ này; freeze vẫn có thể bảo vệ ngày đó.
- Căn cứ phạt dùng chuỗi kết thúc đúng ngày trước check-in, không tự bỏ qua ngày bị thiếu. Tránh phạt thêm vì chuỗi đã đứt trước đó.
- Từ chối check-in tương lai theo múi giờ tài khoản bằng HTTP 400 trước khi ghi check-in/XP. Chặn giá trị LocalDate.MIN tránh tràn khi tính ngày trước đó.
- Không cần migration mới. Huy hiệu đã cấp vẫn giữ nguyên theo chính sách hiện tại.

## Kiểm chứng

- Maven verify: 69 tests, 0 failures/errors/skipped; BUILD SUCCESS và đã tạo JAR.
- Năm unit test mới: chuỗi 300 ngày; freeze tại ranh giới cửa sổ; ngày hoàn thành kèm freeze; khoảng chờ chỉ cho ngày chưa ghi; ngày FAILED/SKIPPED; chuỗi phạt không bỏ qua ngày trống; lịch sử rỗng và ngày tối thiểu.
- Hai test HTTP mới chạy trên H2 thường và H2 qua Flyway: chuỗi 150 ngày có freeze đồng nhất với huy hiệu STREAK_100; ngày tương lai không tạo bản ghi hay XP.
- Log: target/phase1-batch6.log.
- Không đổi frontend trong đợt này. Chưa kiểm tra trình duyệt hoặc PostgreSQL thực tế.

## Còn lại trước nghiệm thu A2/public

- Quy tắc lịch ngày nghỉ và targetPerWeek chưa được biểu diễn thành lịch ngày cụ thể; streak hiện vẫn là chuỗi theo ngày.
- Chính sách check-in bù, ngày trước khi tạo habit và tác động lên snapshot phạt của các ngày sau vẫn cần xử lý. Đợt này chưa áp đặt giới hạn số ngày check-in bù.
- Huy hiệu cũ không tự thu hồi hoặc cấp bù hàng loạt; huy hiệu được xét lại khi có check-in hoàn thành.
- Streak rất dài vẫn có chi phí tăng theo lịch sử; đo hiệu năng với dữ liệu thật trước khi thêm bộ đếm lưu sẵn.
- Kiểm thử PostgreSQL, quota các tài nguyên khác, vòng đời Pomodoro và đối soát dữ liệu legacy còn mở. Phase 1 chưa hoàn tất.