# Phase 1 — Đợt 17: Việt/Anh cho thói quen và mục tiêu

Ngày: 26/09/2026. Không deploy.

## Đã thực hiện
- Dịch giao diện danh sách, biểu mẫu tạo/sửa, xác nhận tắt habit, nhãn độ khó/điểm/tần suất.
- Dịch mẫu thói quen và mô tả. Khi chủ động tạo từ mẫu, tên/tags mới dùng ngôn ngữ đang chọn; không đổi dữ liệu đã lưu.
- Dịch danh mục hệ thống dựa trên systemDefault, giữ nguyên danh mục người dùng tự đặt kể cả khi trùng tên mặc định.
- Dịch mục tiêu, trạng thái, biểu mẫu tạo/cộng tiến độ, thông báo lưu trữ cục bộ và khu vực tiến độ chờ xác nhận.
- Dịch một số thông báo API thường gặp về quota và mục tiêu đã kết thúc. Thông báo chưa biết vẫn giữ nguyên.
- Bổ sung businessEnglish.js; dùng chung cơ chế dịch và kiểm tra placeholder của đợt 16.
- Không đổi API, migration, XP hoặc cơ chế retry.

## Kiểm chứng
- npm test: **14 test frontend qua**; thêm kiểm tra thông báo nghiệp vụ có số lượng và bảo toàn tên danh mục người dùng.
- Lint không lỗi, còn 3 warning cũ; bỏ biến catch không dùng trong đoạn đã sửa.
- Vite build qua; static bundle đồng bộ và JAR đóng gói thành công.
- Backend không đổi, không chạy lại 111 test đợt 15.
- Log: target/phase1-batch17-package.log. git diff --check qua.
- Chưa kiểm thử trực tiếp trình duyệt/điện thoại.

## Phần tiếp
Dashboard, nhật ký, thống kê, thử thách, phần thưởng, Pomodoro, hồ sơ, Premium và email còn cần chuyển tiếp. Định dạng ngày/số toàn app và thông báo server động chưa hoàn chỉnh. Ngôn ngữ vẫn là lựa chọn trên trình duyệt, chưa đồng bộ tài khoản.