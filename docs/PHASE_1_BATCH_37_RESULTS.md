# Phase 1 — Batch 37: Sắp xếp thói quen

Ngày: 2026-10-06

## Đã triển khai
- PATCH /api/habits/reorder có validation: 1–500 phần tử, không null, ID dương, sortOrder bắt buộc 0–1.000.000, stackGroup tối đa 255 ký tự.
- Chuyển cập nhật vào HabitService có transaction và khóa user, đồng bộ với create/update/deactivate. Xác minh toàn bộ ID trước khi sửa; ID trùng trả 400, foreign/missing/inactive trả 404 và không sửa phần còn lại.
- GET /api/habits và kết quả reorder sắp theo sortOrder, createdAt, id để thứ tự tồn tại sau reload. Cho phép partial reorder; các giá trị sortOrder trùng được phân định bằng createdAt/id.
- Giao diện Premium thêm nút đưa lên/xuống ở danh sách tất cả (tối đa 500 habit), nhãn truy cập Việt/Anh, khóa khi đang gửi. Giữ stackGroup hiện có. Chỉ cập nhật sau phản hồi server; lỗi thì tải lại.

## Kiểm chứng
- Backend: mvn -B verify đạt 137 tests, không lỗi hoặc bỏ qua.
- Frontend: 38 tests hiện có đạt; build đạt; lint có 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói JAR.

## Giới hạn
Chưa kiểm thử UI trên thiết bị thật hoặc chạy PostgreSQL đợt này. Hai lần sắp xếp đồng thời được tuần tự hóa; yêu cầu hoàn tất sau quyết định thứ tự cuối, chưa có version chống ghi đè từ màn hình cũ. Không thêm trình chỉnh sửa stackGroup; không đổi thứ tự riêng của dashboard. Không deploy.
