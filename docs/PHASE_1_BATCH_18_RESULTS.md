# Phase 1 — Đợt 18: Dashboard và nhật ký Việt/Anh

Ngày: 26/09/2026. Không deploy.

- Dịch nhãn dashboard, tâm trạng, câu động viên, check-in, streak, freeze, liên kết nhanh và thông báo thao tác.
- Dịch nhãn, placeholder, điều hướng ngày và thông báo lưu nhật ký; giữ nguyên tên thói quen và nội dung tự viết.
- Định dạng ngày theo vi-VN/en-US, cố định UTC khi hiển thị giá trị ngày để tránh lệch ngày theo timezone trình duyệt.
- Bỏ thông báo thưởng Combo x1.5 vì backend chưa có thưởng này; chỉ chúc mừng hoàn thành và hiển thị điểm thật từ API.
- Sửa nhãn ngày nhật ký: entry.date là ngày của bài viết, không phải thời điểm lưu cuối.
- Bắt lỗi tải dashboard để hiển thị trạng thái không tải được dữ liệu.

## Kiểm chứng
- 15 test frontend qua, gồm kiểm tra ngày nhuận/ngày đầu năm trong hai timezone đối lập và placeholder bản dịch.
- Lint không lỗi; còn 2 warning Fast Refresh cũ ở ThemeContext/PremiumContext.
- Vite build và Maven package thành công; đồng bộ static bundle. Log: target/phase1-batch18-package.log.
- Backend không đổi; không chạy lại backend tests. Chưa kiểm thử trực tiếp trình duyệt/điện thoại.

## Tiếp theo
Tiếp tục Việt/Anh cho thống kê, review tuần, Pomodoro, thử thách, phần thưởng, hồ sơ và Premium. Email và lỗi API chưa được dịch toàn diện. Nhật ký còn cần cải thiện xử lý tải lỗi/đổi ngày khi request đang chạy; chưa tuyên bố hoàn tất chất lượng public.
