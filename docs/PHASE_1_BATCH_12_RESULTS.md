# Phase 1 — Đợt 12: kiểm thử bắt buộc trước deploy

Ngày: 24/09/2026. Chỉ sửa workflow và tài liệu; chưa push/deploy.

## Đã thực hiện

- Verify hỗ trợ workflow_call để Deploy dùng lại cùng pipeline.
- Job Deploy SelfForge có needs: verify: chỉ chạy sau khi tất cả kiểm tra frontend/backend/PostgreSQL thành công.
- PR và nhánh khác main vẫn Verify độc lập; main chạy Verify trong pipeline Deploy để tránh chạy hai bộ trùng lặp.
- Cả kiểm thử và deploy checkout commit của cùng sự kiện push.
- Giới hạn quyền token GitHub ở contents: read; Fly token chỉ cấp vào bước deploy.
- Concurrency cho cả pipeline với cancel-in-progress: false, không hủy release đang chạy khi có push mới.
- Timeout kiểm thử 25 phút, deploy 20 phút.
- Upload báo cáo Surefire/Failsafe kể cả test lỗi, giữ 7 ngày.
- Bổ sung runbook về trigger, secret, xem lỗi và branch protection.

## Kiểm chứng

- Actionlint trong container tạm: exit 0, không báo lỗi workflow.
- Image kiểm tra: rhysd/actionlint, digest sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667.
- git diff --check trên file sửa: qua.
- Không thay code ứng dụng nên không chạy lại bộ test. Bằng chứng đợt 11: 94 test thường, 38 PostgreSQL và 8 frontend đều qua.
- Chưa có bằng chứng chạy workflow trên GitHub từ các thay đổi này. Cần quan sát sau push trước khi kết luận deploy thực tế thành công.

## Còn lại

- Chưa cấu hình GitHub branch protection hoặc secret của tài khoản; chưa biết hosting hiện tại có đủ cấu hình production.
- Pin phiên bản Fly CLI/action, triển khai theo image digest và diễn tập rollback là hạng mục vận hành tiếp theo.
- E2E, tải, backup/restore và các mục nghiệp vụ Phase 1 còn mở.