# Phase 1 — Đợt 2: điều chỉnh XP khi đổi trạng thái

Ngày: 22/09/2026. Phạm vi: tiếp tục A1, chưa hoàn tất Phase 1.

## Hành vi mới

- Check-in mới lưu điểm cơ sở, tổng phạt thất bại dự kiến (gồm phạt chuỗi nếu có) và tác động XP thực tế. Snapshot được chốt khi tạo check-in lần đầu; sửa điểm habit sau đó không đổi snapshot.
- Chuyển trạng thái hoàn tác tác động cũ trước khi áp dụng tác động mới trong cùng transaction và khóa user. COMPLETED → SKIPPED → FAILED → COMPLETED không tạo thêm XP cơ sở.
- Nếu số dư chỉ có 2 XP nhưng mức phạt là 5, ghi nhận trừ thực tế 2; khi hủy phạt chỉ hoàn 2.
- Nếu không còn đủ số dư để thu hồi điểm COMPLETED đã nhận, trả 409 và giữ nguyên trạng thái/ghi chú/số dư. Không clamp về 0 rồi cho nhận lại đầy đủ để tạo vòng lặp kiếm điểm.
- Lưu mỗi chuyển trạng thái vào `check_in_xp_adjustment`. Request cùng trạng thái chỉ sửa ghi chú, không tạo adjustment.
- Lịch sử phạt giữ bản ghi đã hoàn với `reversed=true`; tổng phạt hiện hành loại các bản đã hoàn. Phạt mới dùng ngày check-in thay vì ngày server xử lý.
- Huy hiệu và XP huy hiệu vẫn là phần thưởng một lần đã kiếm, không thu hồi khi sửa check-in. Sổ mới chỉ đối soát XP cơ sở/phạt check-in; chưa phải ledger cho mọi nguồn XP.

## Migration và dữ liệu cũ

Thêm V2, giữ nguyên V1. Không đoán điểm ban đầu hoặc sửa số dư user cũ. Check-in thiếu snapshot vẫn đọc và sửa ghi chú được; đổi trạng thái trả 409 yêu cầu đối soát. Đây là giới hạn có chủ đích để tránh hoàn sai điểm, không phải đã hoàn thành công cụ sửa dữ liệu cũ.

Test nâng V1 có dữ liệu lên V2 kiểm tra giữ ghi chú, để nguyên snapshot chưa biết và migration không chạy lại. Test startup/restart PostgreSQL được cập nhật kỳ vọng phiên bản 2 nhưng chưa chạy lại khi Docker chưa sẵn sàng.

Xem [hướng dẫn migration](DATABASE_MIGRATIONS.md) trước deploy/rollback. Không tiếp tục ghi dữ liệu bằng code cũ sau khi đã bắt đầu dùng sổ điểm V2.

## Kiểm chứng

Các test mới: vòng chuyển trạng thái kèm thay đổi điểm habit, hoàn đúng khoản phạt thực tế, từ chối thu hồi XP đã tiêu, bảo vệ check-in legacy và nâng V1 → V2 có dữ liệu. Các test nằm trong lớp cha dùng chung cho H2, migration H2 và PostgreSQL IT.

`mvn -B verify`: **39 test, 0 failure, 0 error, 0 skipped; BUILD SUCCESS**, JAR được đóng gói. `git diff --check` qua (cảnh báo LF/CRLF). Log local: `target/phase1-batch2.log`. Đây là kiểm thử H2 và migration H2, chưa xác nhận lại trên PostgreSQL vì Docker daemon chưa chạy. Không deploy online hoặc thay đổi database production trong đợt này.

## Chưa hoàn tất

- PostgreSQL concurrency/upgrade thực tế khi Docker chạy; công cụ đối soát và backfill dữ liệu legacy.
- Quy tắc lịch/streak/timezone đầy đủ (A2). Snapshot phạt chuỗi hiện lấy từ thuật toán streak đang có tại thời điểm tạo check-in, chưa tự tính lại khi sửa ngày quá khứ khác.
- Kiểm chứng thời gian Pomodoro ở server, quota/freeze đồng thời và ledger các nguồn XP khác.
- XP cấp độ và số dư đổi thưởng vẫn theo mô hình hiện tại; tách hai khái niệm này cần đợt thiết kế/migration riêng.
