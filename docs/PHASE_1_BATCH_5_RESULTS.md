# Phase 1 — Đợt 5: quota bảo vệ streak theo gói

Ngày: 23/09/2026. Tiếp tục từ đợt 4 tại `Desktop/projects/self_forge`. Không deploy online.

## Đã sửa

- Quota thật và API remaining thống nhất với Premium status: Free 1 lượt/tháng, Premium/Lifetime còn hiệu lực 5 lượt/tháng.
- Khóa user trước kiểm tra/tạo freeze để hai request không cùng vượt quota.
- Retry cùng habit/ngày trả bản ghi cũ, không mất thêm lượt; kiểm tra ownership trước khi trả bản ghi.
- Quota tính theo `usedAt` trong tháng hiện tại theo timezone hồ sơ, khoảng đầu tháng bao gồm/đầu tháng kế tiếp không bao gồm. Freeze hôm qua ở ngày đầu tháng vẫn dùng quota tháng thao tác, tránh tạo lượt không được tính.
- Khi Premium hết hạn hoặc hạ gói, số lượt còn lại không âm. Không xóa freeze đã dùng trước đó.
- Request thiếu hoặc habitId không dương trả lỗi validation; habit của user khác không tiêu quota.
- Dashboard bỏ fallback 2 lượt không đúng; lỗi tải quota hiển thị dấu hỏi và không tự mở nút freeze bằng dữ liệu giả.
- Không cần migration mới; usedAt đã có trong schema. Lịch sử vẫn nhóm theo ngày được bảo vệ, còn quota nhóm theo ngày thao tác — hai khái niệm khác nhau tại ranh giới tháng.

## Kiểm chứng

- `mvn -B verify`: 60 test, 0 failure/error/skipped; BUILD SUCCESS.
- Ba test HTTP mới (được kế thừa chạy trên H2 thường và migration H2): Free/Premium/retry/hết hạn; hai request khác habit chạy đồng thời chỉ một thành công; validation và ownership.
- Test Clock cố định lúc 00:05 ngày 01/10 tại Việt Nam: bảo vệ ngày 30/09 vẫn phải chịu quota tháng 10.
- Frontend lint không lỗi, còn 4 warning cũ; build qua. Đã đồng bộ bundle mới vào Spring Boot static resources.
- Log: `target/phase1-batch5.log`. Chưa kiểm tra trực tiếp trình duyệt hoặc PostgreSQL trong đợt này.

## Còn lại

- Các giới hạn khác như habit/goal quota vẫn cần kiểm tra concurrency.
- Streak dài hơn 100 ngày, quy tắc ngày nghỉ và check-in bù/tương lai vẫn thuộc A2.
- Đổi timezone qua ranh giới tháng có thể đổi cửa sổ tính quota; chưa có chính sách hạn chế đổi timezone hoặc billing-month cố định. Dữ liệu legacy thiếu usedAt cần đối soát, không tự suy đoán ngày thao tác.
- PostgreSQL integration thực tế và beta chưa được nghiệm thu; Phase 1 chưa hoàn tất.