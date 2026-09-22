> Cập nhật 20/09/2026: đã bổ sung Flyway V1 và bộ kiểm thử migration. Các nhận định “chưa có migration” bên dưới là lịch sử đánh giá 16/09; xem [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) cho trạng thái mới.

# Kế hoạch nâng cấp

## Đợt A — thực hiện trong repository

1. Đóng API tự cấp Premium; trả lỗi rõ ràng đến khi tích hợp thanh toán được xác minh.
2. Lưu profile/password bằng transaction; kiểm tra dữ liệu; thu hồi mọi phiên khi đổi mật khẩu.
3. Logout phía server và kết nối frontend; giới hạn thời gian request; sửa redirect khi login sai.
4. Nhận custom reward trong transaction, khóa user để tuần tự hóa claim; validate giá XP.
5. Test hồi quy HTTP: lưu dữ liệu qua request mới, token bị thu hồi, phân quyền, validation.
6. Build mặc định chạy test; thêm CI frontend/backend, health endpoint và cấu hình deploy an toàn hơn.
7. Chạy kiểm tra thực tế và ghi kết quả vào docs/UPGRADE_RESULTS.md.

## Đợt B — cổng kiểm soát trước public

Các hạng mục trong PRODUCTION_READINESS.md cần staging, nhà cung cấp email/thanh toán, hạ tầng rate limit và quyết định sản phẩm. Không đánh dấu hoàn tất bằng việc chỉ viết tài liệu. Xem DEPLOY_RUNBOOK.md để chuẩn bị pilot.

## Tiêu chí nghiệm thu đợt A

Maven verify và frontend lint/build thành công; test chứng minh không tự cấp Premium, profile/password lưu thật, logout và đổi password vô hiệu token. Ghi rõ hạn chế chưa được kiểm chứng.

## Tiến độ

Đợt A đã thực hiện và kiểm chứng, gồm các lỗi bổ sung phát hiện khi chạy test (lazy user, JSX, goal/review/reorder persistence). Xem UPGRADE_RESULTS.md. Đợt B chưa hoàn thành; không coi kết quả build/test là điều kiện đủ để mở public.
