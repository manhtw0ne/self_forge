# Phase 1 — Batch 34: Premium và thông tin quyền lợi

Ngày: 2026-10-06

## Thay đổi
- Dịch trang Premium sang Việt/Anh, gồm so sánh gói, thời hạn và trạng thái đang dùng; ngày hết hạn theo locale.
- Ghi rõ Premium chưa mở bán, giá VND là dự kiến và chưa cần chuyển khoản. Bỏ giá USD không có căn cứ thanh toán và lời hứa hủy/gói trọn đời khi chưa có điều khoản thực tế.
- Bỏ quảng bá Combo x1.5 vì backend chưa thực hiện. Không quảng bá templates như quyền lợi riêng của Premium vì frontend hiện cho mọi tài khoản sử dụng trong quota habit.
- Nhật ký/tâm trạng hiện không bị backend giới hạn 7 ngày: bảng Free phản ánh lịch sử hiện có, API status trả -1 cho hai trường này. Không siết quyền truy cập hiện có trong đợt này.
- Bảng so sánh chỉ giữ các quyền Premium đã được xác định: quota habit/goal, freeze, weekly review, custom reward, CSV.
- Làm rõ quota Free tính habit đang bật và goal đang thực hiện. Bỏ nhãn khẳng định phổ biến nhất khi chưa có dữ liệu bán hàng.

## Kiểm chứng
- Frontend: 36 tests đạt, build đạt; lint còn 2 cảnh báo fast-refresh cũ.
- Backend: mvn -B verify đạt 129 tests, không lỗi hoặc bỏ qua. Đã đóng gói lại JAR chứa frontend mới.
- Chưa nghiệm thu giao diện trên thiết bị thật, chưa chạy lại PostgreSQL, không deploy.

## Còn mở
Tích hợp thanh toán, webhook xác minh, đối soát và điều khoản gói chưa triển khai. Bảng giá chỉ là dự kiến cũ, chưa xác nhận giá bán. Việc mở bán cần kiểm chứng trọn luồng trước khi bật nút thanh toán.
