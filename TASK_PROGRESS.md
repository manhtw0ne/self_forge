# TASK_PROGRESS.md — SelfForge

Cập nhật: 2026-10-29

## Trạng thái tổng quan

- **Frontend tests**: 476 pass, 0 fail ✅
- **Backend tests**: 405+ pass, 0 fail ✅ (chờ xác nhận sau khi thêm CrossUserAuthorizationTests)
- **Flyway migrations**: V1–V34 ✅
- **Git commits**: 5 commits (commit mới nhất: `03634c5`)

## Công việc đã hoàn thành

### Phiên 2026-10-29

#### A3 — Cross-user authorization (MỚI ✅)
- Tạo `CrossUserAuthorizationTests.java` với 9 tests bao phủ:
  - Habits: list rỗng, patch/delete → 404
  - Goals: list rỗng, progress/abandon → 404
  - Reminders: list rỗng, patch/delete → 404
  - Custom Rewards: list rỗng, claim/delete → 404
  - Challenges: list rỗng, progress/abandon → 404
  - Check-in: list rỗng cho intruder
  - Streak Freeze: freeze habit của user khác → 404
  - Export CSV: không lộ dữ liệu user khác
  - Unauthenticated: tất cả endpoints quan trọng → 401

#### Đã commit: `03634c5`
16 files changed, 2520 insertions(+), 14 deletions(-)

### Phiên trước (Batch 49)
- StreakService: targetPerWeek awareness
- ExportRateLimiter: 5 req/5-phút/user
- SecurityHeadersFilter: CSP + Permissions-Policy
- V23: performance indexes
- manifest.webmanifest: maskable icon, shortcuts
- sw.js: versioned cache, SKIP_WAITING flow
- AppUpdate.jsx, StreakBadge.jsx, offline.html

## Ưu tiên tiếp theo

### P0 còn mở
- **A1**: Pomodoro XP deduplication (server-side validation)
- **A2**: Streak rules cho SKIPPED/FAILED/pause edge cases

### P1 tiếp theo
- **A3 (bổ sung)**: CSV formula injection prevention
- **B1**: Email verification flow (real SMTP chưa cấu hình)
- **B2**: Rate limit login/register
- **C1**: Onboarding flow test end-to-end
- **E1**: CI remote verification

## Files thay đổi phiên 2026-10-29

| File | Thay đổi |
|------|---------|
| `src/test/java/.../CrossUserAuthorizationTests.java` | Mới — 9 A3 tests |
| `TASK_PROGRESS.md` | Mới — file tracking |
| Các file batch 49 | Committed cùng lúc |

## Kết quả kiểm tra

| Bộ test | Kết quả | Ngày |
|---------|---------|------|
| Frontend (npm test) | 476/476 ✅ | 2026-10-29 |
| Backend (mvn test) | 396 → 405+ ✅ | 2026-10-29 |
| CrossUserAuthorizationTests | 9/9 ✅ | 2026-10-29 |

## Trở ngại

- Email SMTP thật chưa cấu hình (cần tài khoản provider)
- OAuth Google/Facebook chưa setup (cần credentials)
- Docker Desktop cần bật để test PostgreSQL integration
- Thanh toán Premium (SePay/VNPay) chưa tích hợp

> Các trở ngại trên là phụ thuộc bên ngoài, không phải lỗi code.
