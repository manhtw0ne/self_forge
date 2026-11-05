# Runbook staging và pilot

## Trạng thái

Chưa mở public. Đợt sửa code không thay thế kiểm chứng PostgreSQL, backup, HTTPS và chống brute force ở hạ tầng.

## Build

Yêu cầu JDK 21, Maven, Node 22.

```powershell
cd frontend
npm ci
npm run lint
npm test
npm run build
cd ..
Copy-Item frontend/dist/* src/main/resources/static/ -Recurse -Force
mvn -B verify
```

Docker build tự build frontend và chạy test backend. Không dùng JAR có bundle frontend cũ. CI thực hiện cùng quy trình.

## Cổng kiểm thử tự động trước deploy

Cập nhật 04/11/2026 — phần này mô tả **cấu hình đang có trong repository**, không phải bằng chứng rằng bất kỳ nền tảng production nào đã nhận release.

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) chạy với mọi `push` và `pull_request`, đồng thời có thể được gọi lại bằng `workflow_call`. Nó cài dependency frontend, chạy lint/test/build, copy bundle mới vào static resources, chạy `mvn -B -Ppostgres-tests verify`, build Docker image `selfforge:release-check`, chạy smoke production cô lập, và lưu Surefire/Failsafe reports trong 7 ngày.
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) hiện là **Manual legacy Fly.io deployment**: chỉ chạy khi người vận hành chọn `workflow_dispatch`. Job `Deploy SelfForge` chỉ chạy sau `Verify release` thành công và chỉ nhận `FLY_API_TOKEN` ở bước `flyctl deploy --remote-only`. Workflow không tự deploy khi push vào `main`; release đang chạy không bị hủy bởi concurrency setting.
- [`fly.toml`](../fly.toml) vẫn xác nhận workflow GitHub deploy đang nhắm Fly.io. [`render.yaml`](../render.yaml) bổ sung mô tả Render Blueprint cho chính dịch vụ web beta: Dockerfile, health check và các biến production không bí mật. Blueprint cố ý **không** tạo PostgreSQL, không có plan/cost cố định và không chứa secret; `DATABASE_URL`, `DATABASE_USERNAME` và `DATABASE_PASSWORD` phải được cung cấp trong Render Dashboard bằng JDBC URL hợp lệ.

Trước một release thủ công qua workflow trên:

1. Chọn đúng commit/branch trong GitHub Actions và xác nhận `Verify release` xanh; nếu lỗi, dừng và tải `test-reports` để xử lý.
2. Chỉ chạy `Deploy SelfForge` khi môi trường đích thật sự là Fly.io và `FLY_API_TOKEN` đã cấu hình trong GitHub secret. Không gửi token vào chat hoặc commit.
3. Với Render, review `render.yaml` trước khi sync — đặc biệt service name, public origin và database đích. Blueprint sync có thể thay đổi cấu hình một service Render cùng tên; không sync thẳng vào production khi chưa có staging/backup. Sau deploy, xác nhận health, version/image digest và smoke test trên URL staging/production.
4. Thiết lập branch protection riêng trên GitHub nếu muốn bắt buộc checks trước merge; tên required check phải khớp job/run thực tế.

Cổng tự động và Blueprint không thay thế checklist staging, backup và smoke test bên dưới. Chưa có GitHub Actions run, Blueprint sync hay deployment production nào được xác minh chỉ bằng nội dung file này.

## Database và secrets

- `SPRING_PROFILES_ACTIVE=prod`.
- `DATABASE_URL` phải là JDBC URL, ví dụ `jdbc:postgresql://HOST:5432/selfforge?sslmode=verify-full`, không phải URL `postgres://`.
- `DATABASE_USERNAME`, `DATABASE_PASSWORD`: cấp qua secret store; không commit.
- `APP_CORS_ALLOWED_ORIGINS`: origin HTTPS chính xác của frontend nếu chạy khác domain.
- `PORT=8080` nếu không có yêu cầu khác.

Production hiện dùng `ddl-auto: validate`: cố ý dừng nếu schema thiếu/sai, không tự thay đổi dữ liệu. **Đã có Flyway V1 (20/09/2026): database PostgreSQL trống sẽ tự được tạo bảng trước bước validate.** Xem [quy trình migration](DATABASE_MIGRATIONS.md). Database cũ chưa có lịch sử Flyway không được tự baseline. Chuẩn bị migration từ schema hiện hữu trên bản sao database, review SQL, chạy staging và validate trước. Không dùng `create`/`create-drop` trên database chứa dữ liệu thật.

## Cổng kiểm soát staging

1. Tạo PostgreSQL staging tách biệt; kiểm tra migration và khởi động prod không sinh tài khoản demo.
2. Cấu hình TLS và rate limit login/register ở ingress; kiểm tra 429 và không khóa nhầm mọi user sau proxy.
3. GET `/api/health` trả 200 với database hoạt động và 503 khi database không truy cập được. Fly đã có health check.
4. Thử hai tài khoản: đăng ký, đăng nhập, tạo habit, check-in, sửa profile, đổi password, logout. Token cũ phải trả 401.
5. Xác nhận user Free không tự kích hoạt Premium; các API Premium trả 403. Chưa bán gói trả phí.
6. Diễn tập request đồng thời trên PostgreSQL, mobile và lỗi mạng. Test H2 không thay thế bước này.
7. Backup bằng công cụ PostgreSQL/nhà cung cấp; restore sang database riêng rồi kiểm tra số bản ghi và luồng đăng nhập. Ghi thời điểm, thời gian khôi phục và người chịu trách nhiệm.
8. Cấu hình cảnh báo health/5xx/latency, retention log và ngân sách hạ tầng.

## Rollback

Lưu image digest và cấu hình release trước. Nếu health/smoke test thất bại, chuyển traffic về image trước; không tự đảo schema hay restore đè dữ liệu. Đánh giá tương thích schema trước rollback. Khôi phục backup sang database riêng trước khi quyết định chuyển kết nối.

## Pilot và bằng chứng có người dùng

Mời nhóm 5–10 người sau khi qua staging. Với sự đồng ý của họ, ghi số đăng ký, tạo habit đầu tiên, check-in đầu tiên và quay lại ngày 7; không thu nội dung nhật ký. Định nghĩa user hoạt động là user không phải demo/test có check-in trong 7 ngày. Chưa có số liệu này ở repository. Chốt tiêu chí mở rộng sau ít nhất một tuần pilot và xử lý lỗi chặn luồng chính.

## Hạn chế phiên đăng nhập

Token vẫn lưu localStorage; cần đánh giá chuyển HttpOnly cookie kèm CSRF trước mở public. Logout khi offline chỉ xóa phiên tại trình duyệt, không đảm bảo thu hồi server. Đổi mật khẩu thành công thu hồi tất cả phiên và yêu cầu đăng nhập lại.
