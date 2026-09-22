> Cập nhật 20/09/2026: đã bổ sung Flyway V1 và bộ kiểm thử migration. Các nhận định “chưa có migration” bên dưới là lịch sử đánh giá 16/09; xem [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) cho trạng thái mới.

# Kết quả nâng cấp — 2026-09-16

## Bổ sung migration — 20/09/2026

Flyway V1 đã được triển khai cho 18 bảng PostgreSQL. Profile prod tự migrate rồi Hibernate validate; database có dữ liệu chưa có lịch sử Flyway sẽ bị từ chối tự baseline. CI bổ sung kiểm thử PostgreSQL bằng Testcontainers.

`mvn -B -Ppostgres-tests clean verify`: **PASS**, 19 test thông thường + 10 test PostgreSQL 16.15, không failure/error/skip. Đã kiểm tra khởi động mới và restart giữ dữ liệu. Hai hướng dẫn Render/Neon và Fly/Neon đã được cập nhật. Chưa deploy online, chưa chuyển dữ liệu H2 cũ và chưa hoàn thành các yêu cầu public khác.

## Đã triển khai

- Chặn tự cấp Premium qua `/api/premium/activate`; PremiumInterceptor không tiếp tục khi xác thực phát sinh lỗi.
- Tải user cùng auth session để tránh LazyInitializationException khi tạo habit/đọc Premium status.
- Profile/password có transaction và validation; kiểm tra timezone; đổi mật khẩu thu hồi mọi phiên.
- Thêm logout server idempotent, frontend gọi trước khi xóa token.
- Sửa lưu goal progress/update/abandon, review tuần và reorder habit bằng transaction.
- Claim custom reward có transaction và khóa user để tuần tự hóa các lần claim; kiểm tra giá XP dương. Đã kiểm tra nhận lại cùng phần thưởng bị từ chối; chưa chứng minh mọi tương tác đồng thời với check-in/Pomodoro trên PostgreSQL.
- Sửa lỗi JSX thiếu thẻ đóng khiến frontend không build được.
- Thêm timeout API, proxy local; sai mật khẩu không redirect làm mất thông báo lỗi.
- Không cache phản hồi API; thêm Permissions-Policy.
- Health endpoint kiểm tra kết nối database; Fly health check; graceful shutdown.
- Production yêu cầu credentials riêng và validate schema. Chưa có migration versioned: database trống sẽ không khởi động; đây vẫn là blocker phải xử lý trước deploy.
- Test chạy mặc định trong Maven; Docker chạy verify; thêm GitHub Actions CI.
- Đồng bộ frontend mới vào static resources để JAR chứa bản đã sửa.

## Kiểm chứng thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| `mvn -B verify` | PASS: 10 test, 0 failure, 0 error; đóng gói JAR thành công |
| `npm run lint` | PASS với 4 warning có sẵn (Fast Refresh và unused variables) |
| `npm run build` | PASS: 97 modules |
| `git diff --check` | PASS; chỉ cảnh báo chuyển LF/CRLF |

Test bao phủ luồng habit/check-in/dashboard/challenge, yêu cầu đăng nhập, cách ly danh sách habit giữa hai user, profile lưu qua request mới, đổi mật khẩu và thu hồi hai phiên, logout, validation, chặn tự cấp Premium, nhận thưởng một lần, lưu tiến độ goal và cập nhật weekly review, health response.

## Chưa được kiểm chứng / chưa hoàn thành

Chưa chạy Docker image, PostgreSQL staging, trình duyệt E2E/mobile, load/concurrency test, dependency vulnerability scan hoặc GitHub Actions trên remote. Chưa deploy, chưa truy cập database production, chưa xác nhận có người dùng thật.

Đợt A hoàn thành trong phạm vi đã ghi; đợt B còn mở. **Chưa đủ cơ sở mở public hoặc thu tiền.** Các bước tiếp theo nằm trong PRODUCTION_READINESS.md và DEPLOY_RUNBOOK.md, gồm migration, rate limit, backup/restore, account recovery, timezone và pilot.
