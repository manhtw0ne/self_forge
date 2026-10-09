# Phase 1 — Đợt 1: chống tác động lặp lên XP

Ngày: 22/09/2026. Phạm vi: một phần A1, chưa đủ điều kiện mở public.

## Thay đổi đã thực hiện

- Check-in giữ nguyên trạng thái chỉ cập nhật ghi chú, không cộng XP hoặc tạo phạt lại.
- Khóa theo user trước khi đọc/ghi check-in để các request đồng thời không cùng tạo bản ghi hoặc cùng nhận thưởng.
- Hoàn thành lại một Pomodoro đã hoàn thành trả kết quả đã lưu, không nhận thêm 5 XP, không ghi đè ghi chú hoặc giờ kết thúc.
- RewardService dùng cùng khóa user cho đọc/tạo số dư, cộng/trừ XP và xét huy hiệu; phối hợp với khóa đã có ở nhận custom reward.
- Không thay schema, không sửa dữ liệu lịch sử hoặc tự đối soát số dư có thể đã bị lỗi trước đây.

## Bằng chứng kiểm thử

Trước sửa, thêm 4 test vào ProductionSafetyTests và chạy: 12 test, 3 failure + 1 error. Tái hiện được cộng XP lặp, phạt lặp, Pomodoro ghi đè kết quả/XP và unique constraint lỗi khi cùng tạo một check-in.

Sau sửa, bổ sung thêm test cộng XP đồng thời với nhận thưởng. `mvn -B verify`: **29 test, 0 failure, 0 error, 0 skipped**, đóng gói JAR thành công. Bao gồm 5 test mới chạy ở cả lớp kiểm thử thông thường và lớp kế thừa kiểm thử migration trên H2.

- Gửi thêm 10 lần COMPLETED không tăng XP; ghi chú cập nhật và chỉ còn một check-in.
- Gửi thêm 10 lần FAILED không trừ thêm điểm, chỉ có một bản ghi phạt.
- Bốn request cùng hoàn thành một habit mới đều thành công và chỉ tăng điểm một lần.
- Pomodoro gọi complete lại giữ nguyên kết quả đã lưu và chỉ có 5 XP.
- Ba lần cộng 10 XP đồng thời với nhận thưởng giá 30 XP giữ đúng số dư ban đầu.

Log local: `target/phase1-before.log`, `target/phase1-after.log`. `git diff --check` qua (có cảnh báo LF/CRLF).

Docker daemon chưa chạy, không kết nối được pipe `dockerDesktopLinuxEngine`; **chưa chạy lại PostgreSQL Testcontainers**. Các test mới nằm trong lớp cha mà PostgresMigrationIT kế thừa; cần chạy `mvn -B -Ppostgres-tests verify` khi Docker sẵn sàng. Không coi kết quả H2 là xác nhận khóa/concurrency trên PostgreSQL.

## Việc tiếp theo bắt buộc

1. Snapshot điểm và ledger theo nguồn để đổi COMPLETED → SKIPPED/FAILED → COMPLETED không giữ XP cũ rồi cộng thêm; đợt này chỉ xử lý request giữ nguyên trạng thái. Lỗi luân phiên trạng thái vẫn còn và vẫn chặn public.
2. Chốt hoàn điểm/phạt khi số dư đã tiêu hoặc bị clamp về 0; giữ audit và tránh hoàn nhiều hơn khoản đã trừ thực tế.
3. Pomodoro: hiện vẫn chưa xác minh thời gian đã trôi qua ở server; chỉ chặn thưởng lặp cùng phiên, chưa chặn hoàn thành sớm hoặc tạo nhiều phiên giả.
4. Chạy concurrency trên PostgreSQL, bổ sung các tương tác freeze/quota và các trường hợp chuyển trạng thái.
5. Tiếp tục A2 timezone, lịch và streak sau khi nền tảng XP được nghiệm thu.

Không đánh dấu toàn bộ A1 hoặc Phase 1 hoàn tất từ kết quả đợt này. Các giai đoạn OAuth/OTP/thanh toán, AI và bạn đồng hành chưa được triển khai trong đợt này.
