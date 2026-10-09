# Ước lượng còn lại — sau batch 47

Cập nhật 2026-10-07. Đây là dự trù theo phạm vi còn thiếu, chưa phải lịch cam kết hoặc số liệu vận tốc đã đo. Thay thế ước lượng theo số đợt ở ngày 26/09; nhiều đợt vừa qua quá nhỏ nên không thể trừ số học để suy ra ngày hoàn tất.

Giả định một người làm đều 4–6 giờ/ngày, 5 ngày/tuần, giữ phạm vi hiện tại và có dịch vụ/tài khoản sẵn khi cần:

| Mốc | Công việc còn lại | Dự trù |
|---|---|---|
| Web public lõi, Phase 1 | OAuth, email thật, thanh toán/webhook, quyền dữ liệu/xóa tài khoản, lịch/check-in, PWA/push, E2E/tải/backup và beta | 20–35 ngày làm việc |
| AI Phase 2 bản đầu | Consent/quota/chi phí, weekly review, goal plan, restart, đánh giá chất lượng | 10–18 ngày |
| Companion Phase 3 bản đầu | Asset, XP ledger, tiến hóa, API/UI, đối soát | 8–15 ngày |
| Mobile/store và nghiệm thu cuối | Đóng gói, thiết bị thật, yêu cầu store, sửa lỗi beta | 8–15 ngày |
| Tổng công việc | Chưa tính chờ bên ngoài | 46–83 ngày, khoảng 10–17 tuần |

Mốc web lõi khoảng 4–7 tuần; có thể phát hành trước AI/companion/store sau khi đạt nghiệm thu. Nếu tiếp tục chỉ làm mỗi lượt một thay đổi nhỏ thì lịch có thể dài hơn đáng kể. Các phần mở rộng AI như chat coach chưa nằm trong ước lượng bản đầu.

## Tiến độ có bằng chứng
- Backend gần nhất: 155 tests thường đạt ở batch 47; PostgreSQL gần nhất 58 tests ở batch 43. Thay đổi nhật ký batch 46 và V9 chưa kiểm chứng PostgreSQL vì Docker đang tắt.
- Frontend gần nhất trước batch 48: 41 tests đạt; chưa có bằng chứng E2E thiết bị thật cho toàn app.
- Email OTP đã có code nhưng chưa nghiệm thu SMTP thật; OAuth, thanh toán, push, AI và companion vẫn là các nhóm công việc lớn chưa hoàn tất.

## Tổ chức các lượt tiếp theo
1. Hoàn tất kiểm chứng V9 và nghiệm thu journal/dashboard theo một nhóm, cập nhật checklist theo bằng chứng.
2. Ưu tiên các mốc chức năng lớn của Phase 1 thay vì tiếp tục chia từng lỗi nhỏ thành một mốc sản phẩm.
3. Mỗi nhóm phải có API/UI, test phù hợp và danh sách việc cần chủ dự án thao tác. Chỉ chốt ngày phát hành sau beta.

## Phụ thuộc người dùng
Cần bật Docker Desktop; chuẩn bị tài khoản OAuth, domain/email, ngân hàng/cổng thanh toán, khóa API AI và thiết bị thử khi đến từng nhóm. Không gửi secret vào chat/repository. Deploy vẫn để sau theo yêu cầu. Chờ duyệt dịch vụ/store và quan sát beta 2–4 tuần có thể kéo dài lịch; thời gian beta có thể chồng lấp với phát triển sau.
