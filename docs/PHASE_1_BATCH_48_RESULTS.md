# Batch 48 — Bản nháp dài và ước lượng

Ngày: 2026-10-07

- Nhật ký chỉ rõ các mục vượt 5.000 ký tự khi khôi phục bản nháp cũ, khóa lưu và không cắt nội dung. Đồng nhất hằng số giới hạn frontend.
- Thêm 2 tests ranh giới/đa mục và emoji UTF-16. Tổng 43 tests frontend đạt; lint 2 cảnh báo cũ, build/đóng gói đạt.
- Backend không đổi, không chạy lại tests. V9 vẫn chờ PostgreSQL; không deploy hoặc E2E.
- Cập nhật REMAINING_UPGRADE_ESTIMATE.md: dự trù web lõi 4–7 tuần, toàn bộ bản đầu 10–17 tuần theo giả định 4–6 giờ/ngày, 5 ngày/tuần; chưa tính chờ dịch vụ và duyệt store. Không dùng số lượt chat để đo hoàn tất.
