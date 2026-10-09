# Migration PostgreSQL — SelfForge

Cập nhật 22/09/2026. Có V1 tạo schema ban đầu và V2 bổ sung snapshot điểm, lịch sử điều chỉnh XP check-in và trạng thái hoàn phạt.

## V5 — OTP đăng ký

26/09/2026: registration_code lưu challenge theo email; app_user.email_verified_at nullable phân biệt tài khoản đã xác minh bằng luồng mới. Tài khoản cũ giữ nguyên. Đã kiểm tra V1–V5 bằng H2 qua Flyway, chưa chạy PostgreSQL V5. Không sửa migration đã áp dụng.

## V4 — OTP quên mật khẩu

Ngày 26/09/2026: thêm bảng password_reset_code (mỗi tài khoản một bản ghi hash OTP, hạn dùng và hạn mức). Không thay dữ liệu tài khoản cũ. Đã kiểm tra schema V4 trên H2 PostgreSQL mode; PostgreSQL thực tế đợt 11 mới xác nhận V1–V3. Cần chạy lại profile postgres-tests trước phát hành V4.

## V3 — Chống cộng tiến độ mục tiêu lặp

Cập nhật 24/09/2026: V3 thêm goal_progress_receipt với ràng buộc unique (goal_id, request_key). Không sửa dữ liệu mục tiêu hiện có. API dùng requestId để retry an toàn; API cũ thiếu mã vẫn hoạt động nhưng không được chống lặp. Receipt và tiến độ được lưu cùng giao dịch.

Đã kiểm chứng schema mới, nâng cấp từ V1 và migration chạy lại trên H2 qua Flyway (94 test toàn bộ). Đợt 11 ngày 24/09/2026 đã chạy thành công 38 integration test trên PostgreSQL 16.15, cùng 94 test thường, bao gồm V1–V3 và restart giữ dữ liệu. Backup và chạy profile postgres-tests trước phát hành. Không xóa receipt để tiết kiệm dung lượng khi vẫn cần bảo đảm retry; xóa goal qua API sẽ dọn receipt tương ứng.

## V2 — Điểm check-in và dữ liệu cũ

Flyway tự áp dụng `V2__check_in_xp_accounting.sql` sau V1; không sửa V1 đã chạy. V2 tạo bảng `check_in_xp_adjustment` và thêm các cột nullable vào check-in, giữ nguyên bản ghi/số dư hiện có. Các check-in cũ chưa biết điểm gốc vẫn xem và sửa ghi chú được, nhưng đổi trạng thái trả 409 yêu cầu đối soát; không tự lấy điểm habit hiện tại để hoàn XP cũ. Check-in mới lưu điểm gốc và tác động XP thực tế.

Backup trước nâng cấp; kiểm thử trên bản sao PostgreSQL trước deploy. Đã xác nhận V1–V3 trên PostgreSQL 16.15 ở đợt 11 ngày 24/09/2026; xem PHASE_1_BATCH_11_RESULTS.md. Không rollback về code cũ rồi tiếp tục ghi check-in: code cũ không biết cập nhật sổ điểm mới. Nếu phải rollback, dừng ghi check-in và đối soát các nguồn liên quan trước khi bật lại.

## Deploy lần đầu với Neon mới

Bạn không cần chạy SQL thủ công. Tạo database **trống**, nhập `DATABASE_URL` (JDBC), `DATABASE_USERNAME`, `DATABASE_PASSWORD`, và chạy app với `SPRING_PROFILES_ACTIVE=prod` theo một trong hai hướng dẫn deploy.

Khi khởi động, Flyway tạo 18 bảng ban đầu ở V1, bảng điều chỉnh XP ở V2, bảng receipt tiến độ ở V3 và các cột/ràng buộc mới; ghi lịch sử vào `flyway_schema_history`. Hibernate tiếp tục kiểm tra schema bằng `ddl-auto: validate`. Sau đó ứng dụng mới nhận request. Khi restart/redeploy, Flyway chỉ chạy các migration mới, không tạo lại bảng hoặc xóa dữ liệu.

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

## V8 — habit_batch_receipt
Lưu user_id, request_id UUID, fingerprint và tối đa 10 habit ID cho retry batch. Unique (user_id, request_id), user FK cascade. Không sửa V1–V7. Retry không bật lại habit đã tắt. Cần kiểm chứng PostgreSQL trước khi triển khai migration này.

### Kiểm chứng V8 — 2026-10-07
Batch 41: PostgreSQL 16.15, 56 integration tests đạt; validate V1–V8 và startup/restart giữ dữ liệu. Đây là database Testcontainers riêng, chưa chạy migration trên production.

## V9 — long_journal_entries
Mở rộng bốn cột nhật ký lên VARCHAR(5000). Không sửa migration cũ. Cần kiểm chứng trên PostgreSQL trước triển khai; rollback app không cần thu hẹp cột và không được tự cắt nhật ký dài đã lưu.
