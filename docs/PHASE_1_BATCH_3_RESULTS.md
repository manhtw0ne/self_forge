# Phase 1 — Đợt 3: xác minh Pomodoro trước khi cấp XP

Ngày: 23/09/2026. Phạm vi: tiếp tục A1, không phải hoàn tất Phase 1.

## Đã thay đổi

- Server chỉ chấp nhận phiên tập trung nhận XP dài từ 25 đến 120 phút; bỏ trống dùng 25 phút. Nghỉ ngắn/nghỉ dài vẫn là bộ đếm giao diện, không nhận XP.
- Thời gian bắt đầu/kết thúc lấy từ `Clock` server; từ chối complete trước `startedAt + durationMinutes`. Thêm bean Clock để kiểm thử ranh giới thời gian chính xác mà không chờ 25 phút.
- Dưới cùng khóa user, kiểm tra phiên đã hoàn thành có thời gian kết thúc sau lúc phiên hiện tại bắt đầu. Hai phiên chồng nhau không cùng nhận 5 XP, kể cả request complete chạy đồng thời.
- Complete lặp cùng phiên vẫn trả kết quả cũ, không cấp XP hoặc ghi đè note/end time. Phiên cũ có duration không hợp lệ không được nhận XP mới.
- Validation note tối đa 255 ký tự; tài khoản khác không hoàn thành được phiên không thuộc mình.
- Frontend tính số giây còn lại từ mốc kết thúc thay vì trừ một giây mỗi callback. Khi callback bị trì hoãn do chuyển tab, lần cập nhật tiếp theo dựa trên thời gian đã trôi qua.
- Chặn bấm bắt đầu nhiều lần khi request đang chạy; không cho đổi habit của phiên đã bắt đầu. Hết giờ chỉ báo nhận XP sau khi server xác nhận.
- Nếu lưu thất bại, giữ session ID và hiện nút thử lưu lại; thông báo chi tiết của server được hiển thị. Phiên đã xong có nút bắt đầu phiên mới, không chạy lại bộ đếm 0 giây.
- Lịch sử phiên chưa hoàn thành dùng nhãn “Chưa hoàn thành”, không khẳng định mọi phiên bỏ dở vẫn đang chạy.

## Quy tắc và giới hạn

Server xác minh thời gian tối thiểu đã trôi qua, không chứng minh người dùng thật sự tập trung. Pause hiện ở frontend; server chưa lưu thời gian pause/resume. Bộ đếm client dừng khi pause, nhưng request API thủ công sau đủ thời gian lịch vẫn có thể hoàn thành.

Quy tắc không chồng phiên có tính bảo thủ: phiên bắt đầu trước giờ kết thúc của một phiên đã nhận XP sẽ bị từ chối, dù người dùng để phiên cũ chưa hoàn thành lâu. UI hướng dẫn bắt đầu phiên mới; không tự thu hồi XP phiên đã ghi nhận.

Chưa phục hồi timer sau reload/đổi trang, chưa có vòng đời cancel/expire hoặc giới hạn tạo phiên trên server. Những phần đó cùng timezone thống kê ngày vẫn cần xử lý ở các đợt tiếp theo. Không có migration mới trong đợt này.

## Kiểm chứng

- `mvn -B verify`: **47 test, 0 failure, 0 error, 0 skipped; BUILD SUCCESS**.
- Bốn test thời gian độc lập dùng Clock cố định: trước hạn 1 ms, đúng hạn + retry, phiên chồng thời gian và duration legacy không hợp lệ.
- Hai test HTTP mới chạy trên H2 thông thường và migration H2: duration/early complete/ownership/note; complete hai phiên chồng nhau đồng thời trả một 200 và một 409, tổng 5 XP.
- Test complete lặp có fixture thời gian bắt đầu 25 phút trước; không giảm validation production để chạy test.
- `npm run lint`: không lỗi, còn 4 warning có sẵn ngoài trang Pomodoro. `npm run build`: qua.
- Đồng bộ build frontend vào static resources và chạy `mvn -B -DskipTests package` để JAR chứa bản giao diện mới sau lượt verify đã qua.
- Log local: `target/phase1-batch3.log`, `target/phase1-batch3-package.log`.

Chưa chạy E2E trình duyệt/thiết bị thật hoặc PostgreSQL Testcontainers trong đợt này; không coi H2 là bằng chứng concurrency production. Chưa deploy online.

## Tiếp theo

1. Clock/ngày nghiệp vụ theo timezone user cho các service (A2), gồm thống kê Pomodoro với khoảng ngày đúng và xử lý DST.
2. Vòng đời timer: khôi phục phiên, pause/resume/cancel phía server và hạn chế tạo phiên.
3. PostgreSQL integration/concurrency khi Docker sẵn sàng; tiếp tục đối soát legacy và các mục A1 còn mở.
