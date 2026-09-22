# Migration PostgreSQL — SelfForge

Cập nhật 20/09/2026. Migration V1 đã được thêm tại `src/main/resources/db/migration/postgresql/V1__initial_schema.sql`.

## Deploy lần đầu với Neon mới

Bạn không cần chạy SQL thủ công. Tạo database **trống**, nhập `DATABASE_URL` (JDBC), `DATABASE_USERNAME`, `DATABASE_PASSWORD`, và chạy app với `SPRING_PROFILES_ACTIVE=prod` theo một trong hai hướng dẫn deploy.

Khi khởi động, Flyway tạo 18 bảng ứng dụng, khóa ngoại và ràng buộc theo entity hiện tại; ghi lịch sử vào `flyway_schema_history`. Hibernate tiếp tục kiểm tra schema bằng `ddl-auto: validate`. Sau đó ứng dụng mới nhận request. Khi restart/redeploy, Flyway chỉ chạy các migration mới, không tạo lại bảng hoặc xóa dữ liệu.

Danh mục và huy hiệu mặc định vẫn do các data loader hiện có tạo sau migration. Profile prod không tạo tài khoản demo.

Trong log, tìm thông báo áp dụng `1 - initial schema` ở lần đầu; các lần sau schema đã ở phiên bản hiện tại. Kiểm tra `/api/health` và thử đăng ký/tạo habit/check-in. Không đưa password vào log hoặc ảnh chụp.

## Database đã có bảng hoặc dữ liệu

V1 dành cho database mới. `baseline-on-migrate=false` giúp ứng dụng từ chối tự nhận một schema cũ chưa được kiểm tra là hợp lệ. `clean-disabled=true` ngăn thao tác Flyway clean xóa schema.

Nếu gặp `Found non-empty schema ... but no schema history table`, dừng lại. Không bật baseline tự động và không đổi `ddl-auto` sang create/update để bỏ qua lỗi. Cần backup, phục hồi bản sao riêng, so sánh schema với V1, rồi thiết kế migration tiếp nhận dữ liệu cũ. Việc chuyển dữ liệu H2 local sang PostgreSQL cũng là công việc riêng, chưa nằm trong V1.

## Kiểm thử local và CI

```powershell
# Test thông thường: API H2 và migration SQL trên H2 PostgreSQL mode
mvn -B verify

# Kiểm thử trên PostgreSQL 16 thật trong container tạm (cần Docker đang chạy)
mvn -B -Ppostgres-tests clean verify
```

Profile `postgres-tests` chạy integration test, không bỏ qua nếu Docker không sẵn sàng. Testcontainers tạo database tạm và tự dọn container khi kết thúc; không dùng Neon hoặc dữ liệu cá nhân. CI cũng chạy profile này. Dockerfile build app chạy test thông thường vì không yêu cầu Docker lồng trong Docker.

Kiểm thử bao gồm khởi động prod từ database trống, Hibernate validate, luồng API kế thừa, khởi động lại giữ nguyên bản ghi, migration không chạy lại, không tạo demo user và từ chối baseline một schema đã có dữ liệu.

Testcontainers được đặt ở 1.21.4 để tương thích Docker Engine 29. [Release chính thức](https://github.com/testcontainers/testcontainers-java/releases/tag/1.21.4).

## Khi thay đổi cấu trúc database

Kết quả ngày 20/09/2026: `mvn -B -Ppostgres-tests clean verify` **BUILD SUCCESS** — 19 test thông thường và 10 test integration PostgreSQL 16.15, không lỗi hoặc bỏ qua. Đã kiểm tra database trống, restart giữ bản ghi và từ chối schema cũ chưa có lịch sử migration. Chưa deploy hoặc kết nối Neon thật; chưa đo RAM app trên hosting 512 MB.

Không sửa V1 sau khi đã áp dụng lên database. Thêm `V2__ten_thay_doi.sql`, rồi V3,... vào cùng thư mục. Kiểm tra trên PostgreSQL và thử nâng cấp từ bản sao database trước khi release. Không xóa bảng lịch sử, không dùng Flyway repair để che lỗi checksum. Nếu migration/checksum thất bại, đối chiếu bản đã release và khôi phục file đúng trước.

Flyway chỉ bật mặc định trong profile prod. H2 dev và các test cũ giữ cách chạy hiện tại để không tác động database local đã có. Không cần đổi biến môi trường deploy ngoài các biến đã nêu trong hai hướng dẫn.
