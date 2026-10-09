# Phase 1 — Đợt 19: Thống kê và tổng kết tuần Việt/Anh

Ngày: 26/09/2026. Không deploy.

## Đã thực hiện
- Dịch giao diện thống kê, biểu mẫu tổng kết tuần, lịch sử review và thông báo thao tác; giữ nguyên tên thói quen và nội dung tự viết.
- Dịch màn hình chặn Premium và nút nâng cấp dùng chung.
- Dùng định dạng ngày theo ngôn ngữ cho tuần, lịch sử và tooltip heatmap; định dạng số cho điểm và trung bình tâm trạng.
- Sửa nhãn so sánh tháng: backend trả chênh lệch tỷ lệ, vì vậy hiển thị điểm phần trăm thay vì phần trăm tăng trưởng. Ví dụ 50% lên 70% là tăng 20 điểm phần trăm.
- Stats báo lỗi và có nút thử lại khi dữ liệu chính tải thất bại; lỗi tải tâm trạng được thông báo riêng.
- Không mở biểu mẫu review trống khi tải review hiện tại thất bại; báo lỗi và cho thử lại. Phân biệt lỗi lịch sử với lịch sử rỗng.
- Bắt lỗi tải lại lịch sử sau khi lưu, giữ thông báo lưu thành công nếu POST đã thành công.

## Kiểm chứng
- 16 test frontend qua, bao gồm placeholder bản dịch, ngày theo múi giờ và nhãn điểm phần trăm.
- Lint không lỗi; còn 2 warning Fast Refresh cũ trong ThemeContext/PremiumContext.
- Vite build và Maven package thành công, static bundle đã đồng bộ.
- git diff --check qua. Log đóng gói: target/phase1-batch19-package.log.
- Backend không đổi; không chạy lại backend tests. Chưa kiểm thử giao diện và các nhánh lỗi trên trình duyệt/điện thoại; unit tests không thay thế kiểm thử này.

## Tiếp theo
Tiếp tục đa ngôn ngữ cho Pomodoro, thử thách, phần thưởng, hồ sơ và trang Premium. Các lỗi tải dữ liệu phụ hiện có thông báo nhưng chưa có nút thử lại riêng. Email và thông báo API vẫn chưa được dịch toàn diện. Phase 2 AI và phase 3 companion chưa được triển khai trong đợt này.
