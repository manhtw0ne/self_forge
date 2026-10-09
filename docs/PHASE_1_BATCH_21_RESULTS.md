# Phase 1 — Đợt 21: Khôi phục bộ đếm Pomodoro trong tab

Ngày 26/09/2026. Không deploy.

## Thực hiện
- Lưu trạng thái bộ đếm bằng sessionStorage, khóa theo tài khoản, tách component theo user để không mang state sang tài khoản khác.
- Reload/điều hướng về trang trong cùng tab khôi phục mode, sessionId, habit và thời gian. Phiên chạy dùng deadline tuyệt đối; phiên tạm dừng giữ số giây còn lại.
- Khi khôi phục phiên đã hết giờ, chờ người dùng bấm thử lưu; chỉ API server có quyền xác nhận hoàn thành và cấp XP.
- Không đổi chế độ khi còn sessionId, kể cả đang tạm dừng. Đặt lại phải xác nhận bỏ phiên; không xóa bản ghi trên server.
- Cảnh báo khi storage lỗi/hỏng; không âm thầm ghi đè dữ liệu không đọc được.
- Thông báo mới có Việt/Anh.

## Kiểm chứng
19 frontend tests qua, gồm 3 test mới kiểm tra deadline, pause, hết giờ, tách tài khoản, trạng thái hỏng và storage bị chặn. Lint không lỗi, còn 2 warning Fast Refresh cũ. Vite build, Maven package và git diff --check qua. Static bundle đã đồng bộ. Log: target/phase1-batch21-package.log.

Backend không đổi, không chạy lại backend tests. Chưa kiểm thử tương tác trình duyệt/điện thoại; helper tests chưa chứng minh toàn bộ lifecycle React.

## Giới hạn và phần tiếp theo
- sessionStorage chỉ bảo đảm phạm vi cùng tab; không hứa giữ phiên khi đóng tab, đổi thiết bị hoặc đồng bộ nhiều tab.
- Request start đang bay khi reload/điều hướng, hoặc đã tạo phiên server nhưng response mất, vẫn cần requestId/khôi phục từ server. Đợt này chưa giải quyết khoảng trống đó.
- Pause vẫn là trạng thái client, server kiểm tra thời gian tối thiểu từ startedAt và chống cộng XP phiên chồng nhau; chưa có pause/cancel server.
- Reset chỉ bỏ theo dõi tại bộ đếm, không đánh dấu canceled trong lịch sử server.
- Chưa đánh dấu toàn bộ Pomodoro đạt nghiệm thu public. Ưu tiên tiếp: start idempotent và vòng đời phiên trên server, rồi kiểm thử tích hợp.
