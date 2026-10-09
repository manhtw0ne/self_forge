# Phase 1 — Batch 47: Nhật ký dài hơn

Ngày: 2026-10-07

## Thay đổi
- V9 mở rộng win/obstacle/lesson/tomorrow_focus từ VARCHAR(255) sang VARCHAR(5000), không sửa migration cũ.
- Entity/API/frontend cùng giới hạn 5.000 đơn vị độ dài chuỗi mỗi mục. Form có bộ đếm; nội dung tiếng Việt được giữ nguyên. Emoji có thể chiếm hai đơn vị UTF-16 ở giới hạn client/API.
- Bản nháp hiện có không bị cắt; request vượt giới hạn trả 400.
- Test lưu/đọc lại bốn mục tiếng Việt dài 5.000, cùng test vượt 5.001 và ghi đồng thời từ batch 46.

## Kiểm chứng
- 155 tests backend đạt, gồm migration schema trên H2 và lưu/đọc nội dung dài; mvn verify thành công.
- 41 tests frontend hiện có đạt; build đạt; lint còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói lại JAR.
- Docker info vẫn báo thiếu pipe dockerDesktopLinuxEngine; chưa kiểm chứng V9 trên PostgreSQL.

## Giới hạn
Chưa deploy. Cần chạy PostgreSQL trước khi phát hành V9; Docker Engine không khả dụng ở đợt 46. Chưa có version chống ghi đè bản sửa giữa nhiều tab. Nội dung dài trong CSV/chế độ mobile cần nghiệm thu trực tiếp.
