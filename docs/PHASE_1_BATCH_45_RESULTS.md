# Phase 1 — Batch 45: Check-in và freeze trên Dashboard

Ngày: 2026-10-07

## Thay đổi
- Dùng ref + state khóa các thao tác check-in/freeze trong cùng trang khi đang xử lý; không gửi nhiều yêu cầu thay đổi song song từ giao diện.
- Phân biệt lỗi POST và lỗi refresh sau POST thành công. Nếu đã lưu, thông báo đúng trạng thái; không tự retry POST.
- Khi chưa xác nhận hoặc chưa tải lại được dữ liệu, yêu cầu refresh trước thao tác tiếp. Retry tải lại bị chặn trong khi đang ghi mood/action.
- Sau thành công, dashboard và số lượt freeze lấy lại từ server. Bỏ toast combo hẹn giờ để không phát muộn sau thay đổi trang.
- Thông báo Việt/Anh; không đổi nghiệp vụ XP hoặc quota backend.

## Kiểm chứng
- 41 tests frontend đạt, gồm 3 tests phân biệt save failure/refresh failure/success và không tự lặp save.
- Lint có 2 cảnh báo fast-refresh cũ; build/đóng gói JAR đạt, static resources đã đồng bộ.
- Backend không đổi, không chạy lại tests (mốc batch 43: 151 tests thường + 58 PostgreSQL).

## Giới hạn
Chưa E2E thao tác/mất mạng thực tế hoặc đồng bộ nhiều thiết bị. Khóa frontend chỉ tác dụng trong trang đang mở; các bảo vệ server hiện có vẫn là căn cứ cho request từ tab khác. Không deploy.
