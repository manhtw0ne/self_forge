# Cách 1: Deploy SelfForge bằng Render Free + Neon Free

Hướng dẫn cho Windows, cập nhật ngày 16/09/2026. Phù hợp học deploy và thử nghiệm nhóm nhỏ. Bạn chỉ cần làm một trong hai hướng dẫn, không cần chạy cả Render và Fly.

## 1. Hiểu kết quả và chi phí

Render chạy cả giao diện React và backend Java trong Dockerfile có sẵn. Neon lưu PostgreSQL. Người dùng truy cập một đường link HTTPS do Render cấp; chưa cần mua tên miền.

Mục tiêu là 0đ trong hạn mức Free, không phải cam kết miễn phí không giới hạn. Chọn workspace và instance miễn phí, không bật dịch vụ trả phí. Kiểm tra Billing/Usage định kỳ; nếu thêm phương thức thanh toán, xem cả giới hạn chi tiêu và phí vượt hạn mức. [Giá Render](https://render.com/pricing), [giá Neon](https://neon.com/pricing).

Render Free ngủ sau 15 phút không có truy cập; lần mở sau mất khoảng một phút để thức dậy. Render không khuyến nghị Free cho production. Database Render Free hết hạn sau 30 ngày, vì vậy hướng dẫn này dùng Neon. [Giới hạn Free](https://render.com/docs/free).

## 2. Điều kiện bắt buộc trước deploy

**Cập nhật 20/09/2026: đã có migration V1.** Khi chạy profile prod, Flyway tự tạo bảng trên PostgreSQL mới, rồi Hibernate validate schema. Bạn không cần viết hoặc chạy SQL thủ công. Dùng database trống; database đã có dữ liệu cần xử lý theo [hướng dẫn migration](DATABASE_MIGRATIONS.md). Trước khi deploy, kiểm tra:

- Có migration tạo schema được đưa vào mã nguồn.
- Đã chạy migration trên PostgreSQL thử nghiệm và khởi động profile `prod` thành công.
- `mvn verify` và frontend build thành công.

Không đổi sang `create`, `create-drop` hoặc dùng `update` như cách bỏ qua bước này trên dữ liệu thật. Migration đã nằm trong source; hướng dẫn này không tự deploy ứng dụng. Xem [runbook kỹ thuật](DEPLOY_RUNBOOK.md).

## 3. Chuẩn bị mã nguồn trên GitHub

Bạn cần tài khoản GitHub, Render và Neon. Có thể dùng repository private và cấp cho Render quyền đọc repository đó.

Mở PowerShell trong đúng thư mục:

```powershell
cd 'C:\Users\evol\Downloads\projects\code\build_code\self_forge'
git status
git remote -v
```

Tên thư mục là `build_code` và `self_forge`, không chèn dấu `\` trước dấu gạch dưới.

Nếu chưa có repository trên GitHub, dùng GitHub Desktop để thêm thư mục dự án hiện tại, review thay đổi, commit và Publish repository với tùy chọn private. Nếu đã có repository, commit/push các sửa đổi cần deploy lên nhánh bạn chọn. Không tạo repository lồng vào thư mục hiện tại.

Đảm bảo phiên bản trên GitHub có `Dockerfile`, `pom.xml`, `src/`, `frontend/package.json`, `frontend/package-lock.json` và migration đã hoàn thiện. Không đưa password, `.env` chứa secret, thư mục `data/` hoặc database local lên GitHub. Bản chưa commit/push trên máy bạn sẽ không được Render lấy.

## 4. Tạo database Neon

1. Đăng nhập [Neon](https://neon.com/), chọn gói Free.
2. Tạo project `selfforge-test`; chọn khu vực gần khu vực chạy app, ưu tiên Singapore nếu có.
3. Mở **Connect** trên project dashboard.
4. Ghi lại Host, Database, Role/Username và Password. Dùng kết nối trực tiếp (tắt pooling) cho bản thử nghiệm nhỏ này.
5. Giữ thông tin riêng trên máy; không gửi password vào chat hoặc screenshot.

Không cần dùng Neon Auth; app hiện có hệ thống đăng nhập riêng. Cách lấy thông tin kết nối: [Neon connection guide](https://neon.com/docs/connect/connect-from-any-app).

Ví dụ thông tin giả:

```text
Host: ep-example.ap-southeast-1.aws.neon.tech
Database: neondb
Username: neondb_owner
```

Ứng dụng cần URL JDBC, không chứa username/password:

```text
jdbc:postgresql://ep-example.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require
```

Thay host/database bằng giá trị thật. Password đặt ở biến riêng. Nếu Neon đưa chuỗi `postgresql://USER:PASSWORD@HOST/DATABASE?...`, hãy lấy từng trường từ Connect; không chỉ thêm `jdbc:` vào chuỗi chứa credentials. `sslmode=require` yêu cầu kết nối mã hóa; xem cấu hình xác minh chứng chỉ khi chuẩn bị production.

## 5. Tạo Web Service trên Render

**Chỉ tiếp tục sau khi hoàn tất mục 2.**

1. Đăng nhập [Render Dashboard](https://dashboard.render.com/).
2. Chọn **New → Web Service** và kết nối GitHub.
3. Chọn repository SelfForge và nhánh chứa bản đã kiểm thử.
4. Điền cấu hình:

| Trường | Giá trị |
| --- | --- |
| Name | `selfforge-evol` hoặc tên khả dụng |
| Region | Singapore nếu có, gần Neon |
| Language/Runtime | Docker |
| Root Directory | Để trống nếu `Dockerfile` ở gốc repo |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` nếu có trường này |
| Instance Type | Free |
| Docker Command | Để trống, dùng ENTRYPOINT trong Dockerfile |
| Health Check Path | `/api/health` |

Không chọn Static Site: app cần backend Java. Không chọn riêng thư mục `frontend` làm root. Dockerfile tự build frontend và backend, nên không cần nhập lệnh npm/Maven vào Build Command. [Docker trên Render](https://render.com/docs/docker), [Web Services](https://render.com/docs/web-services).

## 6. Nhập biến môi trường

Trong phần **Environment**, nhập từng cặp, không thêm dấu nháy bao quanh giá trị:

| Key | Value |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | URL JDBC từ mục 4 |
| `DATABASE_USERNAME` | Username Neon |
| `DATABASE_PASSWORD` | Password Neon |
| `PORT` | `8080` |
| `APP_CORS_ALLOWED_ORIGINS` | Origin HTTPS thực tế Render cấp, ví dụ `https://selfforge-evol.onrender.com` |

Nếu chưa biết URL cuối cùng, cập nhật `APP_CORS_ALLOWED_ORIGINS` ngay khi dashboard cấp URL rồi redeploy. Dùng đúng origin, không có `/api` hay dấu `/` cuối. Không thêm `VITE_API_URL`: frontend đang gọi `/api` trên cùng domain.

Không đưa secrets vào Dockerfile hoặc biến build frontend. Tài khoản demo local không được tạo trong profile `prod`; hãy đăng ký tài khoản mới.

## 7. Deploy và kiểm tra

1. Chọn **Create Web Service/Deploy Web Service**. Render sẽ build và khởi động app.
2. Theo dõi **Logs/Events**. Cần build thành công và service chuyển sang Live/Healthy.
3. Mở URL app. Lần khởi động đầu hoặc sau khi ngủ có thể chậm.
4. Mở `https://TEN-THUC-TE.onrender.com/api/health`, mong đợi `{"status":"UP"}`.
5. Đăng ký → tạo habit → check-in → refresh → logout → đăng nhập lại. Dữ liệu phải còn nguyên.
6. Thử trang `/habits` bằng cách nhập URL trực tiếp và mở trên điện thoại.

Health UP chỉ xác nhận kiểm tra database thành công, không chứng minh tất cả tính năng hoạt động. Xem thêm [health checks](https://render.com/docs/health-checks).

## 8. Lỗi thường gặp

| Dấu hiệu | Kiểm tra/cách xử lý |
| --- | --- |
| `Schema-validation: missing table` | Migration chưa chạy hoặc sai database/schema; quay lại mục 2 |
| `password authentication failed` | Nhập lại username/password Neon; không giữ dấu nháy bao quanh |
| Driver không chấp nhận URL | URL phải bắt đầu bằng `jdbc:postgresql://` |
| Không tìm thấy Dockerfile/pom.xml | Root Directory hoặc Dockerfile Path đang sai |
| Health check thất bại | Kiểm tra log, profile prod, PORT=8080, kết nối Neon và schema |
| Exit 137/OutOfMemory | Có thể vượt RAM; cần đo/tối ưu Java trước khi quyết định nâng gói |
| Mở trang chờ sau một thời gian | Có thể là Free đang thức dậy; kiểm tra Events nếu chờ kéo dài |
| Giao diện gọi localhost | Xóa cấu hình `VITE_API_URL` trỏ localhost rồi build lại |
| Không thấy code mới | Kiểm tra commit đã push và đúng nhánh; chọn Manual Deploy nếu cần |

Free 512 MB chưa được kiểm chứng với tải thật của SelfForge. Không dùng cách ping liên tục để né giới hạn ngủ. Hạn mức build, băng thông và lưu lượng ra ngoài đến Neon cũng cần theo dõi.

## 9. Cập nhật và dừng dùng

Mỗi lần sửa: chạy test → commit/push → deploy nhánh đã chọn. Có thể chọn deploy thủ công để kiểm soát số lần build. [Cách Render triển khai](https://render.com/docs/deploys).

Khi không dùng nữa, sao lưu dữ liệu cần giữ, rồi xóa Web Service thử nghiệm trong dashboard. Chỉ xóa project Neon nếu chắc chắn không cần dữ liệu và không còn app nào dùng. Nếu đã thử Fly trước đó, kiểm tra Billing và tài nguyên Fly riêng; chuyển sang Render không tự dừng tài nguyên Fly.

## Checklist hoàn thành

- [ ] Migration đã kiểm thử trên PostgreSQL.
- [ ] Render và Neon đều chọn Free; kiểm tra Usage/Billing.
- [ ] Secrets không nằm trong Git.
- [ ] `/api/health` UP; các luồng chính qua thử nghiệm.
- [ ] Dữ liệu vẫn còn sau redeploy.
- [ ] Đã thử điện thoại; chưa quảng bá đây là dịch vụ production ổn định.
