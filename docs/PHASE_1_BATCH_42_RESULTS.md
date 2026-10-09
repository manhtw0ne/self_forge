# Phase 1 — Batch 42: Khoảng ngày và validation tâm trạng

Ngày: 2026-10-07

## Thay đổi
- Lịch sử N ngày tính từ hôm nay trừ N-1 đến hôm nay theo timezone user, thay vì N+1 ngày.
- Giới hạn days 1–366, chặn số âm/0/quá lớn trước truy vấn database.
- Trung bình tuần dùng hôm nay và 6 ngày trước; vẫn lấy trung bình các ngày có bản ghi, không coi ngày thiếu là điểm 0.
- API lưu tâm trạng bắt buộc điểm 1–5; thiếu điểm/ngoài khoảng trả 400. Emoji và ghi chú tối đa 255 ký tự, phù hợp cột dữ liệu.
- Không xóa dữ liệu lịch sử hoặc giới hạn quyền truy cập theo tier. Giới hạn days là giới hạn mỗi truy vấn.

## Kiểm chứng
- mvn -B -Ppostgres-tests verify: 149 tests thường và 57 integration tests PostgreSQL 16.15 đạt, không lỗi/bỏ qua.
- Ca mới kiểm tra ranh giới lịch sử 1/7/30 ngày và input sai.
- Build/đóng gói JAR thành công. Không đổi frontend nên giữ kết quả 38 tests gần nhất, không chạy lại.

## Giới hạn
Chưa có phân trang/khoảng ngày tùy chọn để duyệt lịch sử xa hơn 366 ngày qua endpoint này. Chưa thay đổi chính sách ngày tương lai/check-in bù hoặc cạnh tranh cập nhật tâm trạng. Không thay đổi frontend, không deploy.
