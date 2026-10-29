# TASK_PROGRESS.md — SelfForge

Cập nhật: 2026-10-29

## Trạng thái tổng quan

- **Frontend tests**: 476 pass, 0 fail ✅
- **Backend tests**: đang xác nhận (V23–V34 migration, 371+ tests theo lần chạy cuối)
- **Flyway migrations**: V1–V34 ✅
- **Git commits**: 4 commits, nhiều file chưa được commit (staged cho commit tiếp)

## Công việc đã hoàn thành (các phiên trước)

### Batch 49
- StreakService: `targetPerWeek` awareness (SKIPPED ngày không bắt buộc không phá streak)
- ExportRateLimiter: 5 req/5-phút/user
- SecurityHeadersFilter: CSP, X-Frame-Options, Permissions-Policy
- Flyway V23: performance indexes
- manifest.webmanifest: maskable icon, shortcuts
- sw.js: versioned cache, SKIP_WAITING flow
- AppUpdate.jsx: SW update flow hoàn chỉnh
- StreakBadge.jsx component
- offline.html redesign
- Tests: 371 pass (đã fix isRequiredDay, migration count)

## Ưu tiên hiện tại

### P0 — A3: Cross-user authorization tests (ĐANG LÀM)
Ma trận phân quyền: test hai tài khoản không đọc/sửa/xóa tài nguyên của nhau.

### P1 — E1: Commit code và CI
Commit tất cả untracked files có giá trị.

### P1 — A2 còn lại
- Streak cho ngày nghỉ, habit mới, SKIPPED vs FAILED rõ ràng
- Quy tắc check-in bù (past/future limit)

## Files đã thay đổi phiên này

*(sẽ cập nhật khi làm xong)*

## Kết quả kiểm tra

- Frontend: 476/476 ✅ (2026-10-29)
- Backend: đang chạy...

## Bước tiếp theo

1. Xác nhận backend test pass
2. Implement cross-user auth test (A3)
3. Kiểm tra validation input (A3)
4. Commit toàn bộ thay đổi có giá trị
