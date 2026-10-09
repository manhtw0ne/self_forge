# Phase 1 — Batch 38: Quyền danh mục trong thói quen

Ngày: 2026-10-06

## Sửa lỗi
- Habit create/update/batch chỉ nhận danh mục hệ thống hoặc danh mục thuộc tài khoản hiện tại. ID không tồn tại hoặc thuộc người khác trả 404 thay vì gắn liên kết sai.
- Không cho sửa danh mục hệ thống qua API người dùng; danh mục hệ thống vẫn được đọc và gắn vào habit.
- HabitResponse không trả ID/tên/màu danh mục riêng thuộc tài khoản khác nếu dữ liệu cũ có liên kết sai. Không tự động xóa/sửa dữ liệu lịch sử.
- Giới hạn tên/mô tả/tags habit 255 ký tự ở API; frontend đặt maxLength tương ứng. categoryId phải dương khi được gửi.
- Test hai tài khoản cho create/update/batch, rollback cả bộ, đọc liên kết sai cũ, danh mục hệ thống và chuỗi quá dài.

## Kiểm chứng
- Backend: mvn -B verify đạt 141 tests, không lỗi hoặc bỏ qua.
- Frontend: 38 tests hiện có đạt; build đạt; lint chỉ còn 2 cảnh báo fast-refresh cũ.
- Đã đồng bộ static resources và đóng gói JAR mới.

## Còn mở
Cần rà soát các liên kết cũ trên database thật trước khi sửa dữ liệu; truy vấn chỉ đọc tham khảo:

```sql
SELECT h.id AS habit_id, h.user_id AS habit_owner, c.id AS category_id, c.user_id AS category_owner
FROM habit h JOIN category c ON c.id = h.category_id
WHERE c.user_id IS NOT NULL AND (h.user_id IS NULL OR h.user_id <> c.user_id);
```

Chưa chạy truy vấn này trên database người dùng, chưa deploy hoặc kiểm thử PostgreSQL đợt này. Việc bỏ danh mục từ form, đồng bộ điểm khi đổi độ khó và xóa danh mục đang dùng còn cần xử lý riêng.
