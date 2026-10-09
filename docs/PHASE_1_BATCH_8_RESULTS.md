# Phase 1 — Đợt 8: dữ liệu và vòng đời mục tiêu

Ngày: 24/09/2026. Chưa deploy.

## Đã sửa

- Tạo mục tiêu bắt buộc tên không trống, chỉ tiêu nguyên dương; tên/mô tả/đơn vị tối đa 255 ký tự theo schema.
- Sửa mục tiêu từ chối tên trắng và chỉ tiêu không dương. Ngày không hợp lệ trả HTTP 400 có thông báo thay vì lỗi server.
- Tiến độ phải là số nguyên dương. Phép cộng dùng long trước khi giới hạn theo target, tránh tràn int; tiến độ thêm vượt phần còn lại được chặn ở chỉ tiêu.
- Chỉ mục tiêu ACTIVE nhận thêm tiến độ. COMPLETED/ABANDONED trả HTTP 409 và giữ nguyên dữ liệu.
- Giảm chỉ tiêu xuống mức đã đạt tự chuyển COMPLETED, giải phóng quota ACTIVE. Giữ currentValue thực tế đã tích lũy, tỷ lệ hiển thị tối đa 100%.
- Mục tiêu kết thúc không được đổi sang chỉ tiêu khác; vẫn sửa được tên/mô tả/đơn vị/hạn. Muốn theo đuổi chỉ tiêu mới thì tạo mục tiêu mới, áp dụng quota bình thường.
- Không chuyển COMPLETED thành ABANDONED. Bỏ lại một mục tiêu đã ABANDONED vẫn an toàn.
- Không migration, không sửa dữ liệu legacy hàng loạt, không thay đổi frontend.

## Kiểm chứng

- mvn -B verify: **88 tests**, 0 failure/error/skipped; BUILD SUCCESS và đã đóng gói JAR.
- Ba unit test mới kiểm tra tràn số, giảm chỉ tiêu giữ khối lượng đã làm, trạng thái kết thúc và dữ liệu sai.
- Ba test API mới chạy trên H2 thường và H2 qua Flyway: validation không ghi dữ liệu; giảm chỉ tiêu giải phóng quota nhưng không mở lại; mục tiêu bỏ dở và quyền sở hữu.
- Kiểm thử có dữ liệu ngày không tồn tại, số ngoài miền int, tên quá dài, request thiếu amount/target.
- git diff --check trên file sửa: qua. Log: target/phase1-batch8.log.
- Chưa kiểm chứng trình duyệt hoặc PostgreSQL thực tế trong đợt này.

## Còn lại

- Retry cộng tiến độ chưa có idempotency key; hai request hợp lệ vẫn được tính là hai hành động.
- Chưa có luồng điều chỉnh/hoàn tác tiến độ riêng hoặc mở lại mục tiêu.
- PATCH deadline null/rỗng tiếp tục giữ hạn cũ, chưa hỗ trợ xóa hạn.
- Mục tiêu legacy sai trạng thái/chỉ tiêu cần đối soát riêng; thay đổi này không tự sửa toàn bộ dữ liệu cũ.
- A1/A2 còn mở: check-in bù, lịch ngày nghỉ, vòng đời Pomodoro, đối soát XP và kiểm thử PostgreSQL.