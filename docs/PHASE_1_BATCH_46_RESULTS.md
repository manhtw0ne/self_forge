# Phase 1 — Batch 46: Lưu nhật ký đồng thời

Ngày: 2026-10-07

## Thay đổi
- Khóa user trước tìm/tạo nhật ký ngày trong transaction; bốn request cạnh tranh không tạo nhiều bản ghi hoặc lỗi unique.
- API kiểm tra tối đa 255 ký tự cho mỗi mục theo schema hiện tại; frontend maxLength tương ứng. Không tự cắt nội dung đã lưu hoặc bản nháp.
- Test ghi đồng thời kiểm tra một ngày và các trường thuộc cùng một lần ghi; test chuỗi quá dài trả 400.

## Kiểm chứng
- 153 tests backend thông thường đạt, không lỗi/bỏ qua sau khi sửa kỳ vọng HTTP 201 trong test mới.
- 41 tests frontend hiện có đạt; lint còn 2 cảnh báo fast-refresh cũ; build đạt.
- JAR đã đóng gói trước bước integration. PostgreSQL CHƯA kiểm chứng cho thay đổi này: Testcontainers không tìm thấy Docker, docker info xác nhận pipe dockerDesktopLinuxEngine không tồn tại. Không ghi nhận profile verify thành công.
- Cần mở Docker Desktop rồi chạy lại mvn -B -Ppostgres-tests verify.

## Giới hạn
Lần ghi được xử lý sau vẫn thay nội dung trước; chưa có version phát hiện bản sửa cũ từ tab khác. Giới hạn 255 là giới hạn hiện có của database, cần migration để hỗ trợ nhật ký dài. Bản nháp cũ dài hơn giới hạn có thể vẫn xuất hiện và phải chỉnh trước khi lưu. Chưa E2E giao diện, không deploy.
