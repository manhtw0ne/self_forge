# Cách 2: Deploy SelfForge bằng Fly.io + Neon

Hướng dẫn cho Windows, cập nhật ngày 16/09/2026. Fly chạy app; Neon lưu PostgreSQL. Đây là lựa chọn thay cho Render, không cần chạy cả hai.

## 1. Chi phí và điều kiện trước khi bắt đầu

Fly tính tiền tài nguyên, không phải hosting miễn phí lâu dài. Máy 512 MB một shared CPU có giá phụ thuộc khu vực; còn có phí lưu trữ, băng thông và các tài nguyên khác. Kiểm tra giá Singapore và Billing trước khi tạo tài nguyên. Hướng dẫn dùng một Machine và Neon Free để giảm chi phí; đây không phải trần hóa đơn. [Giá Fly](https://fly.io/docs/about/pricing/), [giá Neon](https://neon.com/pricing).

**Cập nhật 20/09/2026: đã có migration V1.** Profile prod tự chạy Flyway để tạo bảng trên PostgreSQL trống, sau đó Hibernate validate schema. Không cần chạy SQL thủ công. Nếu database đã có bảng/dữ liệu, xem [hướng dẫn migration](DATABASE_MIGRATIONS.md); không bật baseline tự động hoặc đổi sang create/create-drop để vượt lỗi.

## 2. Chuẩn bị tài khoản và công cụ

- Tài khoản [Fly.io](https://fly.io/) và [Neon](https://neon.com/).
- Kiểm tra yêu cầu thanh toán mà Fly hiển thị cho tài khoản của bạn trước khi chấp nhận.
- Mã nguồn có Dockerfile và migration đã kiểm thử. Không cần public repository để deploy từ máy.
- Remote builder có thể build thay máy local; không bắt buộc cài Docker Desktop cho cách này.

Mở PowerShell, cài CLI bằng lệnh chính thức:

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

Đóng rồi mở lại PowerShell:

```powershell
fly version
fly auth login
cd 'C:\Users\evol\Downloads\projects\code\build_code\self_forge'
```

Không chèn `\` trước dấu `_` trong đường dẫn. [Hướng dẫn cài Fly CLI](https://fly.io/docs/flyctl/install/).

## 3. Tạo Neon và lấy thông tin JDBC

1. Trong Neon, chọn Free, tạo project `selfforge-test`.
2. Chọn khu vực gần Singapore nếu có.
3. Chọn **Connect**, lấy Host, Database, Role/Username và Password. Dùng direct connection (tắt pooling) cho bản thử nghiệm nhỏ.
4. Chuyển thành URL JDBC không chứa credentials, ví dụ:

```text
jdbc:postgresql://ep-example.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require
```

Thay host/database bằng thông tin của bạn. Đừng dán nguyên `postgresql://USER:PASSWORD@HOST/...` vào `DATABASE_URL`. Username/password sẽ lưu riêng trong Fly secrets. Không cần Neon Auth. [Thông tin kết nối Neon](https://neon.com/docs/connect/connect-from-any-app).

`sslmode=require` yêu cầu mã hóa đường truyền. Việc cấu hình xác minh chứng chỉ và diễn tập restore nằm trong bước chuẩn bị production. Không dùng database production chung với bản demo thử nghiệm.

## 4. Chuẩn bị app trên Fly

Nếu chưa tạo app:

```powershell
fly launch --no-deploy --ha=false
```

- Khi hỏi dùng `fly.toml` có sẵn: **Yes**.
- Tên `selfforge` có thể đã được dùng; chọn tên duy nhất của bạn.
- Region: Singapore (`sin`).
- Chọn Dockerfile hiện có; không tạo PostgreSQL trên Fly vì đang dùng Neon.
- Không tạo Redis/Volume/dịch vụ bổ sung trong hướng dẫn này.
- Nếu hỏi deploy ngay: **No**.

Nếu bạn đã chạy `fly launch --no-deploy`, không cần tạo app lần nữa. Chạy `fly apps list`, đối chiếu app thuộc tài khoản của bạn và trường `app` trong `fly.toml`. Không dùng tên app của người khác. [Fly Launch](https://fly.io/docs/reference/fly-launch/).

Sau launch, kiểm tra `fly.toml` vẫn giữ các giá trị của dự án:

```toml
app = 'TEN-APP-THUC-TE'
primary_region = 'sin'

[env]
  SPRING_PROFILES_ACTIVE = 'prod'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = '30s'
  interval = '30s'
  timeout = '5s'
  method = 'GET'
  path = '/api/health'

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

Đây là phần cấu hình cần đối chiếu, không cần xóa các phần hợp lệ khác. `min_machines_running=0` cho phép app dừng khi nhàn rỗi; không có nghĩa tổng phí bằng 0.

## 5. Nhập secrets, không ghi password vào lịch sử lệnh

Chạy trong thư mục có `fly.toml` đúng app. Đoạn PowerShell sau hỏi thông tin tương tác; password được nhập ẩn, chuyển vào stdin của Fly và không lưu thành file:

```powershell
$sfDbUrl = Read-Host 'Nhap JDBC URL Neon (khong chua username/password)'
$sfDbUser = Read-Host 'Nhap username Neon'
$sfDbSecure = Read-Host 'Nhap password Neon' -AsSecureString
$sfDbCredential = New-Object System.Management.Automation.PSCredential($sfDbUser, $sfDbSecure)
try {
    @(
        "DATABASE_URL=$sfDbUrl"
        "DATABASE_USERNAME=$sfDbUser"
        "DATABASE_PASSWORD=$($sfDbCredential.GetNetworkCredential().Password)"
    ) | fly secrets import --stage
} finally {
    Remove-Variable sfDbCredential, sfDbSecure -ErrorAction SilentlyContinue
}
```

Password vẫn cần tồn tại tạm trong bộ nhớ để gửi lên Fly; đừng bật transcript/debug hoặc chia sẻ màn hình khi thao tác secret. [Fly secrets import](https://fly.io/docs/flyctl/secrets-import/).

Đặt origin bằng tên app thực tế, ví dụ thay `TEN-APP` dưới đây:

```powershell
fly secrets set --stage APP_CORS_ALLOWED_ORIGINS=https://TEN-APP.fly.dev
fly secrets list
```

`--stage` lưu cấu hình để áp dụng khi deploy. `fly secrets list` chỉ kiểm tra tên/digest, không cần in giá trị password. Profile `prod` đã đặt trong `fly.toml`; port mặc định là 8080. Không cấu hình `VITE_API_URL` trỏ localhost: frontend dùng `/api` cùng domain.

## 6. Deploy lần đầu

Với bản code đã có V1, database trống và bộ kiểm thử PostgreSQL đạt, chạy:

```powershell
fly deploy --remote-only --ha=false
fly status
fly machine list
fly checks list
fly apps open
```

Dockerfile tự build React, chạy Maven verify và đóng gói JAR. `--ha=false` tránh tạo Machine dự phòng khi deploy; không tự xóa Machine dư từ lần triển khai trước. Nếu danh sách có nhiều Machine, kiểm tra vai trò và chi phí trước khi giữ chúng. [Các tùy chọn deploy](https://fly.io/docs/flyctl/deploy/).

Không bỏ test để vượt build lỗi. Nếu Java thiếu RAM ở runtime, cần đo/tối ưu trước khi tăng cấu hình; 512 MB chưa được kiểm chứng với tải thực tế. Tăng lên 1 GB làm tăng phí.

## 7. Kiểm tra app

Mở `https://TEN-APP.fly.dev/api/health`, mong đợi:

```json
{"status":"UP"}
```

Thử đăng ký tài khoản mới → tạo habit → check-in → tải lại trang → logout → đăng nhập lại. Profile prod không có tài khoản demo local. Mở `/habits` trực tiếp và thử trên điện thoại.

Xem log khi có lỗi:

```powershell
fly logs
```

Nhấn Ctrl+C để thoát xem log; thao tác này không tắt server.

## 8. Lỗi thường gặp

| Dấu hiệu | Kiểm tra/cách xử lý |
| --- | --- |
| `fly` không được nhận diện | Mở lại terminal, kiểm tra bước cài CLI/PATH |
| App name unavailable | Chọn tên duy nhất; kiểm tra trường `app` trong fly.toml |
| `Schema-validation: missing table` | Migration chưa chạy/sai database; quay lại điều kiện đầu bài |
| PostgreSQL driver từ chối URL | Dùng `jdbc:postgresql://`, credentials tách riêng |
| Password authentication failed | Cập nhật secrets theo mục 5 rồi deploy lại |
| Health check/502/503 | Xem fly logs; kiểm tra database, profile prod và port 8080 |
| Máy bị kill/OutOfMemory | Kiểm tra RAM thực dùng, không mặc định tăng máy khi chưa rõ nguyên nhân |
| App khởi động chậm sau nhàn rỗi | Có thể là auto-start; nếu liên tục lỗi, kiểm tra log và thời gian startup |
| Thấy nội dung cũ | Kiểm tra đang ở đúng thư mục/đúng app rồi deploy lại |

Health endpoint hiện truy vấn database. Theo dõi compute Neon: health check định kỳ khi máy chạy có thể giữ database hoạt động lâu hơn dự kiến. Chưa có số đo mức tiêu thụ thực tế cho cấu hình này.

## 9. Cập nhật, kiểm soát phí và dừng dùng

Sau khi sửa code và kiểm thử:

```powershell
fly deploy --remote-only --ha=false
```

Kiểm tra Billing/Usage sau lần đầu và định kỳ; xem cả Machines, storage, IP, builder và database nếu từng tạo. Không mua Managed Postgres trên Fly theo hướng dẫn này. Dừng Machine không đảm bảo mọi phí tài nguyên khác dừng; ngân sách bạn tự đặt không phải giới hạn thanh toán tự động. [Cách Fly tính phí](https://fly.io/docs/about/billing/).

Khi bỏ bản thử nghiệm: sao lưu dữ liệu cần giữ, xác nhận đúng app rồi xóa app/tài nguyên không dùng qua dashboard. Kiểm tra Billing sau đó. Xóa Fly app không tự xóa database Neon; chỉ xóa Neon khi không cần dữ liệu và không còn app nào sử dụng.

Nếu chuyển từ Render sang Fly, nên tạo database thử nghiệm riêng hoặc chuyển một lần có kế hoạch; không chạy hai bản khác phiên bản schema cùng ghi một database. Xem [runbook backup/rollback và pilot](DEPLOY_RUNBOOK.md).

## Checklist hoàn thành

- [ ] Migration đã qua kiểm thử PostgreSQL.
- [ ] Đúng app/region, một Machine cho bản thử nghiệm.
- [ ] Secrets không nằm trong Git hoặc lịch sử lệnh.
- [ ] Health UP và luồng người dùng đã thử thành công.
- [ ] Đã xem Usage/Billing của cả Fly và Neon.
- [ ] Chưa coi deploy thành công là hoàn thành toàn bộ điều kiện production.
