# Phase 1 — Đợt 20: Pomodoro Việt/Anh và trạng thái tải dữ liệu

Ngày 26/09/2026. Không deploy.

- Dịch chế độ tập trung/nghỉ, điều khiển, thống kê, lịch sử và thông báo thao tác. Giữ nguyên tên habit/ghi chú tự nhập.
- Hiển thị thời điểm phiên theo ngôn ngữ và timezone hồ sơ.
- Thống kê lỗi hoặc đang tải hiển thị dấu gạch thay vì số 0 gây hiểu nhầm.
- Tách lỗi thống kê, lịch sử và danh sách thói quen; thêm nút thử lại và trạng thái lịch sử rỗng.
- Thêm nhãn truy cập cho danh sách chọn thói quen.
- Ước lượng các phase còn lại được ghi tại REMAINING_UPGRADE_ESTIMATE.md.

## Kiểm chứng
16 test frontend hiện có qua, bao gồm kiểm tra placeholder toàn bộ catalog. Lint không lỗi, còn 2 warning Fast Refresh cũ. Vite build, Maven package và git diff --check qua; static bundle đã đồng bộ. Log: target/phase1-batch20-package.log.

Không thay backend và không chạy lại backend tests. Chưa kiểm thử tương tác trực tiếp trên trình duyệt/điện thoại; các nhánh lỗi UI chưa có test tương tác tự động riêng.

## Chưa hoàn thành
Khôi phục phiên khi reload, bắt đầu phiên bị timeout, reset/đổi chế độ khi đang có phiên tạm dừng và đồng bộ nhiều tab cần xử lý vòng đời phiên riêng. Đợt này không thay đổi cơ chế XP hay xác nhận hoàn thành trên server. Toàn bộ Pomodoro chưa được đánh dấu đạt nghiệm thu public.
