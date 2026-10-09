# Phase 1 — Đợt 7: quota thói quen/mục tiêu khi thao tác đồng thời

Ngày: 24/09/2026. Chưa deploy online.

## Thay đổi

- Giới hạn Free vẫn là 10 thói quen hoạt động và 3 mục tiêu ACTIVE, dùng hằng số hiện có.
- HabitService khóa user trước khi đếm và tạo; bỏ kiểm tra ngoài giao dịch trong controller.
- Bật lại habit đã tắt phải kiểm tra quota trong cùng giao dịch; sửa habit đang hoạt động không chiếm thêm lượt.
- Tắt habit cũng dùng cùng khóa để thao tác giải phóng quota nhất quán.
- Tạo mục tiêu khóa user trước khi đếm ACTIVE và lưu. Cập nhật, cộng tiến độ, bỏ mục tiêu và xóa cùng dùng khóa này, tránh mất cập nhật khi chạy đồng thời.
- Dùng COUNT thay vì tải toàn bộ danh sách để kiểm tra quota.
- Premium còn hiệu lực có thể vượt hạn mức Free. Khi hết hạn, dữ liệu đã có được giữ nguyên, vẫn cho sửa habit đang hoạt động; tạo/bật thêm bị chặn cho đến khi số hoạt động thấp hơn hạn mức hoặc nâng cấp.
- Không cần migration hoặc thay đổi frontend.

## Kiểm chứng

- Maven verify: **79 tests**, không failure/error/skipped; BUILD SUCCESS, JAR đã đóng gói.
- Năm test HTTP mới kế thừa chạy trên H2 thường và H2 qua Flyway:
  - Hai yêu cầu tạo habit tranh lượt thứ 10: một HTTP 201, một 409; DB chỉ có 10 habit hoạt động.
  - Hai yêu cầu tạo goal tranh lượt thứ 3: một 201, một 409; bỏ một mục tiêu cho phép tạo thêm.
  - Hai habit đã tắt tranh lượt bật lại cuối: một 200, một 409; tài khoản khác không bật được habit.
  - Premium tạo 11 habit/4 goal, sau hết hạn vẫn giữ dữ liệu và sửa được habit đang bật nhưng không tạo thêm.
  - Hai yêu cầu cộng tiến độ +2 đồng thời kết quả là 4, không mất lần cập nhật.
- git diff --check trên các file sửa: qua.
- Log: target/phase1-batch7.log.

## Giới hạn và bước sau

- Kết quả đồng thời hiện được xác minh trên H2; vẫn phải chạy bộ integration trên PostgreSQL thực tế trước nghiệm thu public.
- API cộng tiến độ là phép cộng: hai request khác nhau đều được áp dụng; retry cùng một thao tác chưa có idempotency key.
- Validation số tiến độ âm/tràn, trạng thái mục tiêu đã hoàn thành/bỏ và chỉnh target vẫn cần một đợt nghiệp vụ mục tiêu riêng.
- Lịch ngày nghỉ, check-in bù, vòng đời Pomodoro và dữ liệu XP legacy còn mở. Phase 1 chưa hoàn tất.