# Phase 1 — Đợt 4: ngày nghiệp vụ theo múi giờ hồ sơ

Ngày: 23/09/2026. Tiếp tục A2 tại thư mục Desktop sau khi di chuyển dự án.

## Thay đổi

- Thêm `UserTime`, dùng `Clock` có thể thay thế trong test. Múi giờ lấy từ hồ sơ; hồ sơ cũ thiếu hoặc sai timezone dùng `Asia/Ho_Chi_Minh`, độc lập múi giờ máy chủ.
- Ngày mặc định của check-in, dashboard, journal, mood, stats, weekly review, challenge, streak freeze, achievement và CSV export dùng cùng nguồn ngày nghiệp vụ. Ngày do người dùng truyền tường minh được giữ nguyên.
- Thống kê Pomodoro tiếp tục nhóm theo ngày bắt đầu phiên, chỉ tính phiên hoàn thành; truy vấn từ đầu ngày (bao gồm) đến đầu ngày kế tiếp (không bao gồm). Ngày DST có thể dài 23 hoặc 25 giờ, không cộng cứng 86.400 giây.
- Nhắc nhở xét 30 phút vừa qua theo timezone hồ sơ, bao gồm lịch ngày hôm trước nếu qua nửa đêm. Bỏ giờ không tồn tại do DST; giờ lặp có thể khớp một trong hai lần xuất hiện. API này vẫn chỉ trả danh sách, chưa có push hay cơ chế chống gửi lặp.
- Nhật ký frontend lấy hôm nay theo hồ sơ; phép chuyển ngày dùng ngày lịch thuần, tránh lệch ngày do đổi nửa đêm địa phương sang UTC.
- Không có migration mới. Ngày lịch đã lưu không được tự chuyển lại khi đổi timezone; timezone mới áp dụng cho ngày mặc định và cách nhóm timestamp ở lần đọc tiếp theo.

## Kiểm chứng

- `mvn -B verify`: **53 test qua, 0 failure/error/skipped; BUILD SUCCESS**. JAR đã chứa build frontend mới.
- `node --test src/utils/dates.test.js`: **2 test qua**. `git diff --check`: qua.
- Test Java bổ sung: trước/đúng nửa đêm Việt Nam, ranh giới năm/tháng, fallback hồ sơ cũ, ngày nhuận, DST 23/25 giờ, truy vấn mood và reminder qua đầu tuần.
- Test repository H2 xác minh Pomodoro bao gồm đầu ngày, loại đầu ngày kế tiếp và loại phiên chưa hoàn thành.
- Hai test frontend xác minh ngày theo hồ sơ và điều hướng qua ngày nhuận/DST/đầu năm.
- Frontend lint còn 4 warning có sẵn; build thành công.
- Log kiểm thử và đóng gói cuối: `target/phase1-batch4-final.log`.

## Còn lại

A2 chưa hoàn tất: quy tắc check-in bù/tương lai, streak ngày nghỉ và chuỗi dài hơn 100 ngày; cơ chế tự làm mới màn hình đang mở qua nửa đêm; rà soát hiển thị timestamp toàn giao diện. Timer reload/pause/resume/cancel phía server vẫn thuộc đợt tiếp theo.

Chưa kiểm thử trình duyệt/thiết bị thật hoặc PostgreSQL trong đợt này. Chưa deploy online.
