# Phase 1 — Đợt 16: nền tảng Việt/Anh và luồng xác thực

Ngày: 26/09/2026. Chỉ frontend; không deploy/migration.

## Đã thực hiện
- LanguageProvider, bộ chọn Tiếng Việt/English ở trang đăng nhập và sidebar.
- Lựa chọn lưu sf_language trong localStorage; khi chưa chọn dùng ngôn ngữ trình duyệt vi/en, không hỗ trợ thì fallback vi. Storage bị chặn vẫn đổi được trong bộ nhớ.
- Cập nhật thuộc tính html lang theo lựa chọn.
- Dịch menu chính, nút giao diện sáng/tối, đăng xuất và nhãn cấp/XP.
- Dịch giao diện đăng nhập, đăng ký OTP và quên mật khẩu; gồm countdown, trạng thái khả dụng, thông báo phổ biến và nút gửi lại.
- Nội dung do người dùng nhập không bị dịch. Chuỗi thay thế qua React text, không dùng HTML động.
- Thông báo backend quen thuộc được ánh xạ; chuỗi chưa có bản dịch hiển thị nguyên văn.
- Chưa lưu ngôn ngữ vào tài khoản/server; lựa chọn dùng chung trình duyệt.

## Kiểm chứng
- npm test: **12 test frontend qua**, gồm 4 test mới cho lựa chọn, fallback storage, nội dung động và tính đầy đủ placeholder trong catalog.
- Lint không lỗi, còn 4 warning cũ; Vite build thành công.
- Bundle đã đồng bộ Spring Boot static, mvn -B -DskipTests package BUILD SUCCESS.
- Backend không đổi, không chạy lại 111 test đợt 15.
- Log: target/phase1-batch16-package.log. git diff --check qua.
- Chưa kiểm tra trực tiếp trên trình duyệt/điện thoại.

## Phạm vi còn lại
- Đây là i18n đợt đầu, chưa phải app tiếng Anh hoàn chỉnh.
- Dashboard, thói quen, mục tiêu, nhật ký, Pomodoro, Premium và các trang nghiệp vụ khác chưa chuyển hết.
- Email OTP vẫn tiếng Việt; cần lưu/truyền locale cho backend trước khi gửi thư đa ngôn ngữ.
- Validation server động, chuỗi chưa biết và thông báo validation native của browser có thể vẫn khác ngôn ngữ đã chọn.
- Chưa đồng bộ lựa chọn nhiều thiết bị/tài khoản và chưa áp dụng locale cho định dạng ngày/số toàn app.