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

Cập nhật 24/09/2026: push main kích hoạt workflow Deploy, gọi lại .github/workflows/ci.yml qua workflow_call. Job deploy có needs: verify, nên khi Verify lỗi, bị hủy hoặc không hoàn tất thành công, deploy không chạy.

Verify gồm npm ci, lint, 8 test frontend hiện có, build, đồng bộ static bundle và mvn -B -Ppostgres-tests verify (có PostgreSQL tạm). Báo cáo Surefire/Failsafe được lưu dưới artifact test-reports trong 7 ngày, kể cả khi test thất bại.

Pull request và push nhánh khác vẫn chạy Verify độc lập. Push main không chạy thêm một Verify độc lập trùng lặp. Các job kiểm thử và deploy của cùng workflow checkout cùng commit của sự kiện push; không dùng workflow_run để lấy nhầm đầu nhánh mới hơn.

Concurrency ở toàn workflow deploy giữ release đang chạy không bị hủy giữa chừng; GitHub có thể thay thế run còn chờ bằng push mới hơn. Timeout Verify 25 phút, deploy 20 phút. Secret FLY_API_TOKEN chỉ được đưa vào bước deploy, không truyền cho workflow kiểm thử.

Kiểm tra sau khi push lần tới:
1. Trong GitHub Actions, Verify release phải thành công trước Deploy SelfForge.
2. Nếu test lỗi, Deploy SelfForge phải hiện skipped; tải test-reports để xem lỗi.
3. Nếu Verify qua nhưng deploy lỗi thiếu token/quyền Fly, cấu hình GitHub Actions secret FLY_API_TOKEN với token phù hợp cho app. Không gửi token vào chat hoặc commit.
4. Branch protection của main vẫn cần cấu hình ở GitHub nếu muốn bắt buộc PR qua kiểm thử trước merge. Job names trong required checks cần khớp run thực tế.

Cấu hình đã qua actionlint local; chưa xác minh một run GitHub Actions từ thay đổi này và chưa deploy. Cổng tự động không thay thế checklist staging, backup và smoke test bên dưới.

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
