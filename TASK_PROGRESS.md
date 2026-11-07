# TASK_PROGRESS.md — SelfForge

Cập nhật: 2026-11-06 (Asia/Bangkok)

## Phạm vi hiện hành — quyết định 2026-11-02

Ưu tiên hoàn thiện phần cốt lõi. Chỉ thử AI tổng kết tuần (AI-2A); tạm dừng mở rộng GOAL, RESTART, JOURNAL, DAILY_FOCUS và CHAT đến khi chủ dự án có quyết định mới. Giữ code/dữ liệu đã có và các chức năng tương ứng không dùng AI. Kế hoạch điều hành: [docs/DEVELOPMENT_PRIORITIES.md](docs/DEVELOPMENT_PRIORITIES.md).

Bước tiếp theo: browser/mobile E2E chuẩn và các provider thật vẫn là ưu tiên nghiệm thu còn mở. Payment foundation V51 đã có regression cục bộ nhưng vẫn tắt mặc định, không được đưa vào luồng bán hàng khi chưa có sandbox/merchant credentials. OAuth V52–V53 đã chặn takeover bằng email và chỉ cho liên kết provider sau re-authentication, kể cả native handoff tách khỏi login; Google/Facebook vẫn tắt khi chưa có app credentials. Snapshot lịch cho check-in bù, timezone backtrack và ngày trước observation đã có regression; history UI qua frontend tests/lint/build, nhưng còn nghiệm thu browser/mobile chuẩn. Chỉ thử weekly khi các điều kiện lõi, consent, ngân sách và đo lường đã sẵn sàng; không tự mở rộng AI theo roadmap cũ.

## Trạng thái tổng quan

- **Thay đổi kế hoạch 2026-11-02**: cập nhật ưu tiên lõi và phạm vi AI; chỉ sửa tài liệu và chỉ dẫn cho các lượt chạy định kỳ. Không chạy lại tests ứng dụng vì không thay code/config. Kết quả test phía dưới giữ nguyên ngày và phạm vi kiểm chứng của phiên trước.

- **Frontend tests**: phiên 2026-11-06: **506 pass**, 0 fail/cancel/skip; lint, runtime audit và production build PASS với Vite 8.3.5 (được chạy lại trong Docker release build). Chưa kiểm thử tương tác UI trên trình duyệt/mobile chuẩn trong runtime này.
- **Backend tests**: Docker release build ngày 2026-11-06 ghi **522 PASS**, 0 failure/error/skip. Đây là full `mvn verify` của worktree hiện tại, bao gồm payment và các regression có trước đó.
- **PostgreSQL/Flyway**: V1–V53 migrate/restart trên PostgreSQL 16 disposable đã PASS; release smoke mới cũng migrate image hiện tại trên PostgreSQL disposable và restart thành công. V51–V53 chưa được migrate vào staging/production.
- **Git**: working tree có các thay đổi payment V51 và thay đổi cục bộ khác từ trước; không reset, stage, commit hoặc ghi đè chúng trong phiên này.

## Rà soát phiên 2026-11-05 (21:55 ICT) — không cần external credentials

### Đã verify qua code review (không cần chạy thêm test):
- **A1 Pomodoro idempotency**: `ProductionSafetyTests` line 1026/1317/1344 đã cover lặp request, concurrent duplicate, `requestId` ✅
- **A2 Streak window**: nâng lên 127 ngày (không còn 100) trong `StreakService.count()` ✅
- **A2 Check-in past 90 ngày**: `CheckInService.upsert()` line 68 — reject ✅; future date reject ✅
- **A2 Frontend dates**: `dates.js` dùng `Intl.DateTimeFormat` với timezone user; `shiftDate` dùng UTC; không có `toISOString()` gửi lên backend ✅
- **A3 CSV formula injection**: ExportController đã có prefix sanitization ✅
- **B1 Session revoke khi đổi mật khẩu**: `ProfileController` line 92 `sessions.deleteByUserId` ✅
- **B1 Hash mật khẩu**: PBKDF2-HMAC-SHA256, 120,000 iterations, 16-byte salt, 256-bit key; timing-safe missing account stub ✅
- **B4 confirmPassword**: validate cả backend (`PasswordResetController` L36, `ProfileController` L84) và frontend (`PasswordResetForm` L47) ✅
- **C1 Premium không có nút mua**: `PremiumPage` chỉ hiển thị "chưa mở bán", không có nút thanh toán ✅
- **C1 StatsPage error/retry**: `sectionStatus()` function với loading, error, retry button ✅
- **SPA routes**: 20/20 ✅ (node verifySpaRoutes.mjs)
- **Frontend 505/505 PASS**, lint 0 warnings ✅

### Blockers còn lại (cần external credentials):
- **B1 real email**: SMTP/Resend API key → email OTP thật
- **B3 OAuth**: Google/Facebook app credentials
- **E1 CI remote**: GitHub Actions workflow chờ approval từ chủ dự án
- **G Android**: Android SDK
- **H Payments**: SePay/VNPay credentials


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
- **A1 — Pomodoro**: code kiểm tra thời gian, retry và phiên chồng nhau đã tồn tại. Full PostgreSQL/Flyway suite hiện hành (**171 Failsafe PASS**) chạy `PostgresMigrationIT`, kế thừa các regression cho concurrent start, overlap completion, idempotent completion và concurrent note. Không triển khai hoặc chạy lại nếu không có thay đổi liên quan.
- **A2**: Target, weekday schedule, freeze với FAILED/SKIPPED, pause/restore, backdated check-in và timezone backtrack đã có regression H2/PostgreSQL hiện hành. Không suy diễn/backfill lịch trước observation; chỉ mở lại khi phát hiện lỗi tái lập được.

### P1 tiếp theo
- **A3 (bổ sung)**: CSV formula injection prevention đã được triển khai và có regression backend/frontend; không làm lại trừ khi thêm một định dạng export mới.
- **B1**: Email verification flow (real SMTP chưa cấu hình)
- **B2**: Rate limit login/register dùng DB chung V42 đã có sẵn và được kiểm chứng trong full verify 2026-10-30 12:39; cấu hình ingress/load trên môi trường triển khai vẫn cần kiểm chứng riêng.
- **C1**: Onboarding UI end-to-end trên browser/device có storage/network chuẩn (hiện bị policy/môi trường chặn).
- **E1**: CI remote verification sau khi chủ dự án cho phép chạy workflow trong repository/hosting đích; workflow local đã được đối chiếu, nhưng chưa tuyên bố remote run.

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
- Docker Desktop khả dụng; PostgreSQL 16.15/V42 integration đã qua trong phiên 2026-10-30 12:39. Staging và backup/restore vẫn cần kiểm chứng riêng.
- Thanh toán Premium (SePay/VNPay) chưa tích hợp

> Các trở ngại trên là phụ thuộc bên ngoài, không phải lỗi code.

## Phiên tự động 2026-10-29 — đồng nhất streak theo mục tiêu tuần

- Kiểm tra project, Git status, TASK_PROGRESS.md, kế hoạch và tests hiện có trước khi sửa. Không tìm thấy AGENTS.md áp dụng trong các thư mục cha hoặc repository.
- A1 Pomodoro đã có implementation và tests, nên tiếp tục A2 thay vì lặp lại công việc hoàn thành.
- Phát hiện dashboard và RewardService vẫn gọi overload mặc định 7 ngày, trong khi CheckInService tính phạt đã truyền targetPerWeek. Habit 5 ngày/tuần có cuối tuần SKIPPED vì vậy hiển thị sai streak và không nhận huy hiệu tương ứng.
- Sửa hai consumer truyền targetPerWeek của habit, giữ nguyên quy tắc hiện có của StreakService.
- Thêm 4 integration tests với clock cố định và database H2 thật: cuối tuần SKIPPED giữ streak cho habit 5 ngày; huy hiệu không cấp XP lặp; habit hàng ngày SKIPPED và ngày nghỉ FAILED vẫn ngắt streak; habit đang pause không xuất hiện trên dashboard hoặc được cấp huy hiệu streak mới.
- Lần kiểm tra đầu: 171 tests, 0 failure, 1 error từ fixture goal-coach có sẵn thiếu created_at trên schema Hibernate H2. Sửa đúng câu INSERT của fixture bằng CURRENT_TIMESTAMP; không sửa production schema hoặc chức năng AI.

### Files thay đổi trong phiên

| File | Thay đổi |
|------|---------|
| `src/main/java/com/selfforge/discipline/dashboard/DashboardService.java` | Truyền targetPerWeek khi đọc streak |
| `src/main/java/com/selfforge/discipline/reward/RewardService.java` | Truyền targetPerWeek khi xét huy hiệu streak |
| `src/test/java/com/selfforge/discipline/StreakConsumerTests.java` | Mới: 4 integration tests hồi quy |
| `src/test/java/com/selfforge/discipline/ProductionSafetyTests.java` | Bổ sung created_at cho fixture goal-coach |
| `TASK_PROGRESS.md` | Kết quả kiểm chứng và bước tiếp theo |

### Kiểm chứng cuối phiên

- `mvn -B test`: **PASS**, 417 tests, 0 failure, 0 error, 0 skip; gồm schema migration V37, cross-user authorization, Pomodoro timing/concurrency, StreakTests và 4 tests mới.
- `git diff --check` trên các file tracked sửa trong phiên: **PASS**; chỉ warning LF/CRLF.
- Không chạy lại frontend vì không thay đổi frontend; kết quả frontend phía trên là kết quả phiên trước.
- Không chạy PostgreSQL/Testcontainers, SMTP, OAuth, thanh toán hoặc CI remote trong phiên này; không coi các tích hợp đó là đã được xác minh.

### Blockers và bước tiếp theo

- Không có blocker mới đối với increment này. Các phụ thuộc bên ngoài đã ghi ở trên vẫn chưa được xác minh/cấu hình trong phiên này.
- Tiếp tục A2: kiểm tra và bổ sung regression tests cho freeze + FAILED/SKIPPED và pause/restore; xác định từ quy tắc sản phẩm hiện có cách xử lý ngày pause và target thay đổi trước khi sửa thuật toán.
- Project **chưa hoàn tất**; tiếp tục lịch 5 giờ, không đánh dấu toàn bộ project hoàn thành từ kết quả test của increment này.

## Phiên tự động 2026-10-29 20:15 (Asia/Bangkok) — freeze và pause/restore

- Kiểm tra lại Git status, HEAD `6d08335`, progress notes, implementation hiện tại và báo cáo quy tắc streak đợt 5/6. Working tree vẫn có nhiều thay đổi từ trước; không reset, stage hoặc commit.
- Tiếp tục A2 bằng kiểm chứng các trường hợp đã ghi ở bước tiếp theo. Không phát hiện lỗi production mới trong các trường hợp kiểm tra, nên không thay đổi thuật toán hoặc quy tắc lịch.
- Bổ sung 5 trường hợp integration trong `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`:
  - Freeze ngày FAILED hoặc SKIPPED bảo vệ chuỗi, không cộng ngày hoàn thành, không hoàn XP/phạt hoặc sửa ghi chú/trạng thái check-in; retry giữ nguyên ID và chỉ dùng một lượt.
  - Huy hiệu streak sau freeze vẫn chỉ cấp XP một lần qua achievement evaluation.
  - Ngày COMPLETED kèm freeze đếm đúng một lần; 6 ngày không tạo huy hiệu 7 ngày.
  - Pause/restore qua HabitService với lịch sử nguyên vẹn hoặc thiếu ngày bắt buộc: dữ liệu check-in giữ nguyên, restore không tạo check-in/freeze/XP và không lấp khoảng trống.
- Thêm `docs/STREAK_RULES.md` ghi rõ quy tắc đang chạy và giới hạn: chỉ lưu active/target hiện tại, không có lịch sử pause/target; ngày SKIPPED khác ngày không có check-in. Không suy diễn ngày pause hoặc âm thầm đổi lịch sử.

### Kiểm tra và giới hạn

- Lần đầu chạy 19 tests có 2 assertion thất bại do baseline XP của test mới lấy trước khi gọi achievement evaluation: FIRST_CHECKIN là huy hiệu toàn tài khoản và hợp lệ dù habit đang pause. Chỉnh baseline về ngay trước restore để đo đúng tác động của thao tác restore; không sửa production code để làm test qua.
- Chạy lại `mvn -B -Dtest=StreakConsumerTests,StreakTests,FreezeMonthTests test`: **PASS**, 19 tests, 0 failure, 0 error, 0 skip (9 integration cases, 9 streak unit tests, 1 month-quota test).
- `git diff --check` file tracked thay đổi trong phiên: **PASS**, chỉ warning LF/CRLF. Kiểm tra whitespace của hai file untracked mới/sửa: PASS.
- Files thay đổi: `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`.
- Không chạy lại toàn bộ backend/frontend, PostgreSQL hoặc tích hợp ngoài vì increment chỉ bổ sung test và tài liệu. Kết quả full suite 417 ở phiên trước không được diễn giải thành full suite mới đã qua.
- Không có blocker mới; SMTP/OAuth/payment và PostgreSQL verification vẫn là các phụ thuộc/kiểm chứng chưa hoàn tất đã ghi trước đó.

### Bước tiếp theo

- Tiếp tục A2: kiểm tra thay đổi targetPerWeek qua API có làm dashboard/huy hiệu/phạt diễn giải lại lịch sử SKIPPED hay không; thêm kiểm thử cho thay đổi target và ghi rõ phạm vi trước khi triển khai lịch sử có hiệu lực theo ngày.
- Pause có hiệu lực theo ngày và target theo lịch sử chưa được triển khai. Project chưa hoàn tất; chưa thay đổi lịch chạy 5 giờ.

## Phiên tự động 2026-10-30 07:18 (Asia/Bangkok) — snapshot mục tiêu tuần trên check-in

- Đầu phiên kiểm tra Git status (777 entries), HEAD `6d08335`, progress notes, quy tắc streak và code hiện tại. V38–V40 đã có sẵn; không làm lại hoặc sửa các migration cũ. Không tìm thấy AGENTS.md áp dụng.
- Hai trường hợp regression mới xác nhận lỗi trước khi sửa: đổi target 5→7 làm streak 7 thành 1; đổi 7→5 làm streak 1 thành 7 dù lịch sử check-in không đổi.
- Bổ sung `targetPerWeekSnapshot` cho check-in mới. StreakService dùng snapshot của từng ngày SKIPPED; dashboard, huy hiệu và căn cứ tính phạt chuỗi cùng hưởng cách tính này. Chỉnh ghi chú/trạng thái không thay snapshot; check-in mới dùng target hiện tại.
- V41 bổ sung cột nullable và constraint 1–7. Legacy giữ null và fallback cũ; không đoán hoặc backfill lịch sử. Export dữ liệu cá nhân có thêm snapshot. Đây là snapshot khi ghi nhận, chưa phải lịch target có hiệu lực theo ngày cho check-in bù.

### Files thay đổi

- `src/main/java/com/selfforge/discipline/checkin/DailyCheckIn.java`: lưu snapshot bất biến theo check-in.
- `src/main/java/com/selfforge/discipline/streak/StreakService.java`: đọc snapshot, giữ fallback legacy và truy vấn theo cửa sổ như trước.
- `src/main/java/com/selfforge/discipline/export/PersonalDataController.java`: xuất snapshot.
- `src/main/resources/db/migration/postgresql/V41__check_in_weekly_target_snapshot.sql`: migration mới.
- `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`: hai trường hợp đổi target, kiểm tra sau flush/clear và huy hiệu.
- `src/test/java/com/selfforge/discipline/ProductionSafetyTests.java`: HTTP regression cho target edit, note/status edit, dashboard, snapshot ngày mới, phạt 20 XP và export; kiểm tra upgrade giữ legacy null.
- `src/test/java/com/selfforge/discipline/MigrationSchemaTests.java`, `src/test/java/com/selfforge/discipline/PostgresMigrationIT.java`: cập nhật schema version, allowance cho fixture tài khoản và localhost CORS trong PostgreSQL test context. Không đổi giới hạn hoặc CORS production.
- `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`: quy tắc, giới hạn và kết quả kiểm chứng.

### Kết quả kiểm chứng và thay đổi đồng thời

- Regression trước sửa: 2/2 fail đúng lỗi 7↔1. Sau sửa, cả hai qua cùng các test HTTP/H2/PostgreSQL.
- Lần full test trên shared target: 436 tests, 0 failure, 8 errors do resource `PasswordResetTests.class` tạm thời không tồn tại; file xuất hiện lại với timestamp mới trong lúc test chạy. Không sửa PasswordResetTests để che lỗi; chuyển sang bản copy nguồn riêng trong thư mục work, giữ target của project nguyên trạng.
- Snapshot riêng V41: toàn bộ **438 backend tests PASS**, 0 failure/error/skip; JAR đóng gói thành công trong lượt `mvn -B -Ppostgres-tests verify`. Lượt verify đó ban đầu chưa qua PostgreSQL do fixture account bị chặn 429.
- PostgreSQL suite được khai báo lại @SpringBootTest nên mất allowance của lớp cha. Thêm allowance 1000 vào test context; per-email limit và cấu hình production giữ nguyên. Thêm localhost vào CORS allowlist của test để phù hợp fixture Origin đã có.
- Trong lúc kiểm chứng, working tree có thêm V42 và assertion version 42 từ thay đổi đồng thời. Giữ nguyên V42 và assertion 42 trong project. Bản copy riêng vẫn chỉ có V1–V41 nên assertion restart trong **bản copy kiểm chứng** được ghim 41; không tuyên bố đã kiểm chứng V42 hoặc toàn bộ working tree mới nhất.
- Chạy cuối trên snapshot riêng: `mvn -B -Ppostgres-tests test-compile failsafe:integration-test failsafe:verify` → **BUILD SUCCESS**, **162 PostgreSQL 16.15 integration tests PASS**, 0 failure/error/skip, gồm HTTP regression mới, upgrade legacy null, schema validation và restart giữ dữ liệu.
- Hash các file implementation/snapshot và StreakConsumerTests trong project khớp bản copy kiểm chứng. Không chạy frontend vì không đổi frontend.
- `git diff --check` trên các file tracked sửa trong phiên và kiểm tra whitespace cho SQL/docs/StreakConsumerTests untracked: PASS; chỉ warning LF/CRLF.
- Không reset, stage, commit hoặc ghi đè thay đổi V42/những thay đổi không liên quan. Không có blocker mới đối với increment V41; SMTP/OAuth/payment vẫn là phụ thuộc ngoài đã ghi trước đó.

### Bước tiếp theo

- Khi nguồn ổn định, tạo snapshot mới từ working tree có V42 rồi kiểm chứng toàn bộ trạng thái mới nhất; không coi 438+162 tests của V41 là bằng chứng cho V42.
- Tiếp tục A2 với legacy check-ins và check-in bù qua nhiều lần đổi target; thiết kế lịch hiệu lực theo ngày/pause trước khi thay fallback legacy. Không triển khai lại snapshot V41 đã hoàn thành.
- Project vẫn chưa hoàn tất; tiếp tục lịch 5 giờ.

## Phiên tự động 2026-10-30 12:39 (Asia/Bangkok) — kiểm chứng V42 và biên snapshot

- Đầu phiên kiểm tra Git status (799 entries), HEAD `6d08335`, progress notes, migration V42, LoginAttemptLimiter và các tests hiện tại; không tìm thấy AGENTS.md áp dụng. Giữ nguyên toàn bộ implementation V41/V42 đã có, không làm lại công việc hoàn thành.
- Bổ sung 3 integration tests có clock cố định trong `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`:
  - Nhiều lần đổi target 5→7→3→6→5 vẫn giữ snapshot đầu tiên và streak của ngày đã ghi, kể cả sau flush/clear.
  - Check-in bù dùng target tại lúc ghi nhận, giữ cùng ID và snapshot qua sửa COMPLETED/SKIPPED, retry và reload entity; không giả định có lịch target của ngày quá khứ.
  - Legacy snapshot null tiếp tục fallback hiện tại; chỉnh ghi chú không tự tạo snapshot hoặc sửa lịch sử. Test ghi rõ giới hạn legacy thay vì âm thầm đổi quy tắc.
- Tạo bản copy backend riêng trong `work/self-forge-validation-20261030-1236` để tránh shared target bị thay đổi trong lúc chạy. Snapshot gồm V42 thực tế và assertion 42 tương ứng; không ghim về V41 như phiên trước.
- Chạy đúng một lượt `mvn -B -Ppostgres-tests verify`: **BUILD SUCCESS**, **449 backend tests + 164 PostgreSQL 16.15 integration tests**, 0 failure, 0 error, 0 skip; JAR đóng gói thành công. StreakConsumerTests có **14 cases**, tất cả pass. Không phải retry từ lỗi hoặc bỏ qua test.
- Sau kiểm chứng, hash **423 file** (`pom.xml` và toàn bộ `src`) trong working tree khớp snapshot, không có source drift. Do đó kết quả bao gồm V42, không còn giới hạn chỉ kiểm chứng V41 của phiên trước.
- `git diff --check` TASK_PROGRESS.md và kiểm tra whitespace của test/docs untracked: PASS. Không chạy frontend, SMTP, OAuth, payment hoặc deploy vì increment chỉ thêm regression tests/tài liệu và kiểm chứng backend.
- Files thay đổi trong phiên: `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`. Không sửa production code, migration hoặc cấu hình; không reset/stage/commit thay đổi có sẵn.
- Không có blocker mới hoặc yêu cầu người dùng xử lý; các phụ thuộc SMTP/OAuth/payment và kiểm chứng staging/backup còn mở.

### Bước tiếp theo

- Tiếp tục A2: thiết kế lịch target/pause có hiệu lực theo ngày và chính sách legacy rõ ràng. Snapshot hiện tại đã được kiểm chứng cho target edits, retry, chỉnh trạng thái/ghi chú và check-in bù; không cần triển khai lại hoặc lặp lại các test này khi không có thay đổi mới.
- Không tự backfill target hoặc suy diễn ngày pause của dữ liệu cũ. Chưa coi chính sách lịch sử hoặc toàn bộ project là hoàn tất; lịch 5 giờ giữ nguyên.

## Phiên tự động 2026-10-30 20:50 (Asia/Bangkok) — ghi nhận lịch sử target và pause/restore

- Đầu phiên kiểm tra Git status (800 entries), HEAD `6d08335`, progress notes, HabitService, batch pause/restore và các write paths. Không tìm thấy AGENTS.md áp dụng. Giữ nguyên các thay đổi optimistic-edit và V41/V42 đã có; không triển khai lại snapshot hoặc rate limiter.
- Tiếp tục A2 bằng nền tảng dữ liệu thực tế cho lịch hiệu lực theo ngày: V43 tạo `habit_state_history`, không backfill hoặc đoán ngày tạo/pause/target của habit cũ.
- Habit mới ghi CREATED. Thay đổi target/active ghi CHANGED; habit cũ chưa có lịch sử ghi trạng thái trước đó dưới dạng OBSERVED tại thời điểm quan sát rồi ghi CHANGED. Cùng ngày/cùng clock tick vẫn giữ từng transition theo ID; lưu cả instant, ngày lịch và timezone tài khoản.
- Metadata-only edits, no-op và retry không thêm event. Ghi habit và history trong cùng transaction đã khóa owner; batch pause/restore đi qua cùng HabitService, giữ validation và quota có sẵn.
- Thêm `GET /api/habits/{id}/state-history`, scope theo chủ sở hữu, trang 20 dòng với beforeId/nextCursor. Foreign habit trả 404, chưa đăng nhập trả 401, cursor không dương trả 400. Habit đang pause vẫn đọc được lịch sử.
- Export cá nhân có `habit_state_history`; xóa tài khoản xóa events thuộc tài khoản đó, giữ dữ liệu người khác. Lịch sử này chưa được nối vào UI hoặc dùng để tính lại streak/check-in bù; quy tắc hiệu lực theo ngày vẫn cần triển khai riêng.

### Files thay đổi

- Mới: `src/main/java/com/selfforge/discipline/habit/HabitStateHistory.java`, `HabitStateHistoryRepository.java`, `HabitStateHistoryService.java`, `HabitStateHistoryController.java` và `src/main/resources/db/migration/postgresql/V43__habit_state_history.sql`.
- `src/main/java/com/selfforge/discipline/habit/HabitService.java`, `HabitPauseBatchController.java`: ghi events cho create, target edit, pause/restore đơn lẻ và theo nhóm.
- `src/main/java/com/selfforge/discipline/auth/AccountDeletionService.java`, `src/main/java/com/selfforge/discipline/export/PersonalDataController.java`: lifecycle dữ liệu cá nhân.
- `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`: account calendar qua biên ngày, nhiều transition cùng ngày, no-op và legacy OBSERVED.
- `src/test/java/com/selfforge/discipline/ProductionSafetyTests.java`: ownership, rollback, pagination ổn định, export, batch retry/atomicity, account deletion và upgrade không backfill.
- `src/test/java/com/selfforge/discipline/MigrationSchemaTests.java`, `PostgresMigrationIT.java`: schema version 43; giữ sentinel ID 42 có sẵn.
- `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`: API, semantics và giới hạn còn lại.

### Kiểm chứng

- Targeted tests: **20 PASS**, 0 failure/error/skip (16 StreakConsumer cases và 4 HTTP history cases qua H2/H2-Flyway).
- Bản copy nguồn riêng `work/self-forge-validation-20261030-2043`: `mvn -B -Ppostgres-tests verify` → **BUILD SUCCESS**, **456 backend tests + 166 PostgreSQL 16.15 integration tests PASS**, 0 failure/error/skip, JAR đóng gói thành công. Full suite bao phủ deletion giữ owner scope, batch retries không nhân đôi event, rollback không thêm event, legacy upgrade và restart.
- Sau kiểm chứng: hash **429 file** (`pom.xml` và toàn bộ `src`) khớp bản copy, không source drift. Không sửa shared target trong lượt full verify.
- `git diff --check` các file tracked sửa trong phiên và kiểm tra whitespace các file Java/SQL/docs untracked: PASS, chỉ warning LF/CRLF.
- Không chạy frontend hoặc deploy; không sử dụng SMTP/OAuth/payment. Không reset, stage hoặc commit các thay đổi khác.
- Không có blocker mới cho increment; credentials/tích hợp ngoài và staging/backup vẫn còn như các phiên trước. Project chưa hoàn tất.

### Bước tiếp theo

- Nối history API vào phần xem lịch sử chỉ đọc của HabitsPage, gồm loading/error, pagination và trạng thái paused; không cần ghi lại hoặc tái tạo events đã có.
- Sau đó xác định/triển khai quy tắc biến observations thành lịch có hiệu lực theo ngày và xử lý khoảng pause, timezone changes, legacy/before-history dates trước khi thay đổi streak hoặc target cho check-in bù. Giữ snapshot V41 của check-in đã ghi.
- Lịch 5 giờ giữ nguyên.

## Điều chỉnh kế hoạch 2026-11-02 — lõi trước, weekly là thử nghiệm AI duy nhất

- Theo yêu cầu trực tiếp của chủ dự án: ưu tiên hoàn thiện phần cốt lõi; chỉ thử AI tổng kết tuần; tạm dừng mở rộng các tính năng AI khác. Không tự khởi động lại chúng khi weekly beta xong.
- Tạo `docs/DEVELOPMENT_PRIORITIES.md` làm nguồn ưu tiên hiện hành. Thứ tự: history UI/lịch và tính đúng đắn → luồng dùng hằng ngày/onboarding/mobile → tài khoản, dữ liệu và cổng phát hành → thử nghiệm weekly có đo lường.
- Đồng bộ `docs/AI_PHASE_2_PLAN.md`, `docs/PUBLIC_PRODUCT_UPGRADE_PLAN.md`, `UPGRADE_PLAN.md` và phần phạm vi đầu TASK_PROGRESS.md. Các kế hoạch GOAL/RESTART/JOURNAL/DAILY_FOCUS/CHAT giữ làm tham khảo, tạm dừng mở rộng; chức năng tương ứng không dùng AI và sửa lỗi cần thiết vẫn trong phạm vi lõi.
- Weekly pilot: tận dụng code, quota, kết quả đã lưu; người dùng chủ động tạo và đồng ý; beta đầu chỉ dữ liệu có cấu trúc, không nội dung nhật ký. Chốt ngân sách trước khi bật provider trả phí, so sánh với bản thống kê/mẫu và đo hành động sau đề xuất, quay lại, chuyển đổi khi phù hợp và tổng chi phí thực tế. Chưa có kết luận ROI dương.
- Cập nhật prompt của automation hiện có để các lượt sau tuân thủ phạm vi mới. Giữ ACTIVE, cùng chat đích và lịch mỗi 5 giờ; không tạo automation khác hoặc đổi cấu hình runtime của app.
- Phạm vi sửa: 5 file tài liệu và prompt automation. Không thay code/config/provider, không xóa implementation AI hoặc dữ liệu đã có; không chạy lại bộ test ứng dụng cho thay đổi chỉ về kế hoạch. Các số test trong tiến độ là kết quả lịch sử có ghi ngày.
- Kiểm tra tài liệu, liên kết nội bộ, whitespace và prompt/lịch đã lưu của automation. Không có blocker cho việc điều chỉnh kế hoạch.
- Bước tiếp theo: nối history UI vào HabitsPage theo thứ tự mới; đọc tài liệu ưu tiên này trước mọi lượt lập trình tiếp theo.

## Phiên tự động 2026-11-02 — hoàn thiện history UI đang có

- Đầu phiên đọc `docs/DEVELOPMENT_PRIORITIES.md`, TASK_PROGRESS.md, Git status và HEAD `6d08335`; working tree có 818 entries thay đổi/untracked. Không tìm thấy AGENTS.md áp dụng. Phát hiện `HabitStateHistory.jsx`, parser/tests và wiring trong HabitsPage đã có trong working tree nhưng chưa được ghi nhận kiểm chứng; tiếp tục hoàn thiện, không xây lại backend V43 hoặc ghi đè các thay đổi khác.
- Xác nhận history xuất hiện trong cùng danh sách render của cả habit đang bật và tạm dừng. Giữ UI chỉ đọc, Việt/Anh, nhãn CREATED/OBSERVED/CHANGED, target và trạng thái, timestamp theo timezone của event, empty/loading/error, tải lại và tải thêm. Không suy diễn lịch trước observation, không đổi check-in/streak/XP.
- Khi target/active đổi hoặc đóng/mở history, xóa danh sách/cursor cũ và hủy quyền cập nhật của response đang chờ. Cho phép đóng khi đang tải; thêm aria-busy và thông báo loading cả khi tải thêm. Lỗi tải thêm giữ các dòng/cursor đã tải để người dùng thử lại. Account state được reset bằng key user.id đã có ở HabitsPage.
- Parser kiểm tra continuation nhỏ hơn beforeId; từ chối trang lặp hoặc trả sai cursor thay vì nối dữ liệu không đúng. Bổ sung kiểm tra ngày lịch thực tế và các regression tests cho legacy OBSERVED, nhiều transition cùng instant, empty, malformed payload, target/state/date và giới hạn trang.
- Thêm habitStateHistory.test.js vào npm test mặc định (trước đó file test có sẵn nhưng không được chạy).

### Files thay đổi trong phiên

- `frontend/src/components/HabitStateHistory.jsx`: reset/đóng/tải và accessibility; giữ implementation UI có sẵn.
- `frontend/src/utils/habitStateHistory.js`, `habitStateHistory.test.js`: validation cursor/ngày và coverage.
- `frontend/package.json`: nối history tests vào lệnh mặc định; giữ các scripts/dependencies hiện có.
- `docs/DEVELOPMENT_PRIORITIES.md`, `TASK_PROGRESS.md`: trạng thái và bước tiếp theo. Wiring có sẵn trong HabitsPage được giữ nguyên, không sửa file đó trong phiên này.

### Kiểm chứng

- `node --test src/utils/habitStateHistory.test.js src/utils/latestRequest.test.js`: **10 PASS**, 0 fail/skip; latestRequest là regression chung sẵn có, không phải test tương tác của component.
- `npm test`: **494 PASS**, 0 fail/cancel/skip, gồm 6 history parser tests. Log: `work/habit-history-frontend-tests-20261102.log` trong workspace chat.
- `npm run lint`: PASS, exit 0.
- `npm run build -- --outDir <workspace-chat>/work/habit-history-build-20261102`: PASS, 457 modules; output riêng trong work, không ghi đè backend static assets. Chỉ cảnh báo outDir nằm ngoài project, không yêu cầu xóa thư mục.
- Không chạy lại backend do không thay Java/SQL/config; 456+166 tests ở trên là kết quả lịch sử 2026-10-30, không phải chạy mới. Chưa chạy browser/mobile interaction hoặc end-to-end trong phiên này; không coi utility tests là bằng chứng cho các tương tác đó.
- Không commit/reset/stage, không bật AI/provider hoặc triển khai. Không có blocker mới cho increment; SMTP/OAuth/payment thực và staging/backup còn phụ thuộc ngoài như đã ghi.

### Bước tiếp theo

- Tiếp tục ưu tiên 2: chốt chính sách lịch target/pause có hiệu lực theo ngày, cùng ngày nhiều transition, timezone changes và ngày trước observation. Sau đó triển khai increment có regression cho check-in bù/legacy, giữ snapshot V41 và không tự backfill lịch sử chưa biết.
- Đưa history UI vào kiểm thử tương tác trình duyệt/mobile cùng onboarding/check-in flow; kiểm tra retry tải thêm, đổi target khi history mở, pause/restore, chuyển account và Việt/Anh. Không tuyên bố đã nghiệm thu các tương tác này chỉ từ build/tests hiện tại.
- Project chưa hoàn tất trong phạm vi lõi; giữ lịch 5 giờ và phạm vi AI đã chốt.

## Phiên tự động 2026-11-03 — streak sau khi đổi lịch tuần sang hằng ngày

- Đầu phiên đọc ưu tiên hiện hành và tiến độ, Git status có 835 entries, HEAD `6d08335`. Không tìm thấy AGENTS.md áp dụng. Working tree đã có thêm lịch chọn thứ, snapshots lịch, pause guard và migrations đến V48 từ thay đổi khác; không xây lại nghiệp vụ đã có. Sửa tương thích V48 phát sinh khi chạy tests được ghi riêng bên dưới.
- Chọn lỗi cụ thể trong ưu tiên 2: StreakService đã tra lịch theo ngày nhưng còn điều kiện `recordedTarget < 7`. Với ngày không có snapshot, điều kiện này dùng target hiện tại; đổi 5→7 làm cuối tuần nghỉ trong lịch sử đột ngột ngắt streak.
- Thêm regression trước sửa: hai trường hợp weekend không ghi check-in và legacy SKIPPED đều fail, kết quả 4 thay vì 5; control lịch sử daily vẫn ngắt đúng. Lượt trước sửa: 13 tests, 2 failures dự kiến, 0 errors/skips.
- Sửa đúng nhánh rest-day để lịch đã resolve quyết định ngày bắt buộc, bỏ gate target hiện tại. Giữ nguyên thứ tự ưu tiên weekday snapshot → V41 target snapshot → history → fallback khi chưa biết; không ghi lại snapshots/check-in hoặc đổi pause/XP.
- Thêm integration test H2 ghi history thật với lịch 5→7, reload và xác nhận dashboard giữ 6 completed days qua weekend không có check-in; không tạo dòng nghỉ giả.
- Files thay đổi trong phiên: `src/main/java/com/selfforge/discipline/streak/StreakService.java`, `src/test/java/com/selfforge/discipline/StreakTests.java`, `StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`. Tài liệu sửa các mô tả đã lỗi thời về missing rest days và bổ sung thứ tự resolve đang có.
- Kiểm chứng backend trên bản copy riêng `work/self-forge-validation-20261103-streak` trong workspace chat để tránh shared target; không chạy frontend vì không đổi UI. Kết quả cuối ghi dưới đây.

### Phát hiện trong lượt kiểm chứng rộng

- Lượt `mvn -B test` đầu sau sửa: 476 tests, 1 failure, 182 errors, 0 skips. Hai nguyên nhân đã xác định: fixture legacy chỉ xóa target snapshot nhưng vẫn có weekday snapshot từ thay đổi mới; các context Flyway không khởi động do V48 dùng nhiều ADD trong một ALTER TABLE, H2 trả SQLState 42000.
- Sửa fixture legacy để cả `target_per_week_snapshot` và `scheduled_days_snapshot` là null, đồng thời kiểm tra chúng vẫn null sau sửa note. Không đổi production logic để làm dữ liệu legacy giả qua test.
- Sửa tương thích V48 đang untracked: tách bốn ALTER TABLE, giữ nguyên cột, constraints và index của code đã có; không thêm tính năng AI, không bật provider, không kết nối hay migrate DB triển khai. Đồng bộ assertion schema V48 và 47 migrations khi upgrade từ V1 trong MigrationSchemaTests, ProductionSafetyTests và PostgresMigrationIT.
- Files bổ sung do phát hiện này: `src/main/resources/db/migration/postgresql/V48__weekly_coach_advice_feedback.sql`, `src/test/java/com/selfforge/discipline/MigrationSchemaTests.java`, `ProductionSafetyTests.java`, `PostgresMigrationIT.java`.
- Lượt kiểm chứng cuối dùng `mvn -B -Ppostgres-tests verify` trên cùng snapshot sau khi đồng bộ chính xác các file sửa; chạy PostgreSQL để kiểm tra cả cú pháp migration, không chỉ H2. Đây là lượt chạy lại sau khi sửa nguyên nhân cụ thể, không retry lỗi không rõ lý do.

### Kết quả cuối và bước tiếp theo

- `mvn -B -Ppostgres-tests verify`: **BUILD SUCCESS**, **476 backend tests + 167 PostgreSQL 16.15 integration tests PASS**, 0 failure/error/skip; JAR đóng gói thành công. StreakTests 13 cases và StreakConsumerTests 19 cases đều PASS. Kết thúc 2026-11-03 07:06 Asia/Bangkok; log `work/streak-full-verify-20261103.log` trong workspace chat.
- Sau kiểm chứng, hash toàn bộ **447 file** nguồn/pom của snapshot khớp working tree, không file snapshot nào bị sửa/mất. Có một file test mới ngoài snapshot xuất hiện đồng thời: `src/test/java/com/selfforge/discipline/coach/WeeklyCoachFeedbackHttpTests.java`; giữ nguyên và chưa kiểm chứng file đó trong lượt này. Không tuyên bố đã chạy toàn bộ working tree bao gồm test thêm sau snapshot.
- V48 migrate/validate thành công trên H2 và PostgreSQL; upgrade legacy và restart suite qua. Việc sửa cú pháp này không thêm hành vi AI, quota, provider hoặc thay đổi ngân sách.
- `git diff --check` các file tracked đã sửa và whitespace của test/SQL/docs untracked: PASS, chỉ warning LF/CRLF. Không reset, stage, commit, deploy hoặc migrate DB người dùng.
- Không có blocker mới đối với increment đã kiểm chứng. Credentials SMTP/OAuth/payment và staging/backup còn mở như trước; không thử lại các tích hợp thiếu credentials.
- Tiếp theo vẫn ưu tiên 2: xác định chính sách timezone changes và bridge khoảng pause cho streak, đồng thời quy định snapshot đầu tiên khi check-in bù. Không suy diễn lịch trước observation; giữ check-in snapshots đã lưu. Nghiệm thu browser/mobile history và onboarding còn mở. Trước lượt kiểm chứng rộng tiếp theo, đọc trạng thái mới và đưa file test concurrent vào snapshot mới nếu nguồn đã ổn định.
- Project chưa hoàn tất trong phạm vi lõi; tiếp tục lịch 5 giờ. Không tự mở lại các AI đã tạm dừng.

## Phiên tự động 2026-11-03 chiều — pause không được che check-in đã lưu

- Đầu phiên đọc docs/DEVELOPMENT_PRIORITIES.md và tiến độ, kiểm tra Git status (842 entries), HEAD `6d08335` và AGENTS.md (không có file áp dụng). Nguồn đã có bridge khoảng pause và các thay đổi rate limiter/dashboard từ phiên khác; không xây lại hoặc ghi đè các phần đó.
- Ưu tiên 2: phát hiện nhánh pause đứng trước kiểm tra COMPLETED/FAILED/SKIPPED, nên có thể làm mất completed count hoặc che failure trên ngày có check-in đã lưu. Điều này cũng ảnh hưởng check-in đã được sửa khi habit đang pause.
- Regression trước sửa: 17 StreakTests, 3 failure dự kiến, 0 error/skip. Cả ba trạng thái saved bị coi là ngày trống trong pause: COMPLETED trả 2 thay vì 3; FAILED/SKIPPED trả 2 thay vì 1.
- Sửa nhánh pause chỉ bridge khi không có bản ghi check-in. Saved COMPLETED tiếp tục đếm, FAILED tiếp tục ngắt nếu chưa freeze, SKIPPED theo lịch snapshot/resolve và freeze giữ tác dụng cũ. Ngày trống trong pause vẫn trung tính; ngày trước observation không tự coi là pause. Không sửa snapshot/check-in/XP hoặc ghi thêm dữ liệu khi đọc streak.
- Thêm parameterized tests cho cả ba trạng thái và freeze, cùng integration H2 cho luồng COMPLETED → pause → correction FAILED → correction COMPLETED. Luồng kiểm tra reload, streak, XP được giữ/khôi phục đúng, cùng ID, target/weekday snapshots không đổi, không tạo thêm ngày và habit vẫn paused.
- Files thay đổi chính: `src/main/java/com/selfforge/discipline/streak/StreakService.java`, `src/test/java/com/selfforge/discipline/StreakTests.java`, `StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`.

### Kiểm chứng và fixture PostgreSQL

- Copy nguồn/pom vào `work/self-forge-validation-20261103-pause` trong workspace chat, tránh shared target. Snapshot gồm **452 file**, bao gồm các test weekly/rate-limit mới đã có lúc bắt đầu; không còn giới hạn bỏ sót file weekly mới như snapshot sáng.
- `mvn -B -Ppostgres-tests verify`: **498 backend tests PASS**, 0 failure/error/skip; StreakTests 17 cases, StreakConsumerTests 22 cases đều PASS. JAR đóng gói thành công. Lượt verify tổng thể chưa thành công vì PostgreSQL fixture bị 429 (170 tests, 143 failures, 0 errors/skips).
- Nguyên nhân PostgreSQL: annotation riêng thay thế cấu hình lớp cha. ProductionSafetyTests đã có `per-client-limit=1000` để tạo nhiều tài khoản từ MockMvc localhost, nhưng PostgresMigrationIT chỉ có global allowance, nên chạm per-client default 30. Không phải lỗi provider hoặc usage limit của tài khoản thật.
- Thêm **chỉ** `app.login-attempt-limit.per-client-limit=1000` vào PostgresMigrationIT, đồng bộ fixture cha; giữ nguyên production config, per-email limits và implementation rate limiter. File bổ sung thay đổi trong phiên: `src/test/java/com/selfforge/discipline/PostgresMigrationIT.java`.
- Chạy lại riêng `mvn -B -Ppostgres-tests test-compile failsafe:integration-test failsafe:verify` sau khi sửa nguyên nhân xác định; không chạy lại 498 unit/backend tests không bị ảnh hưởng bởi cấu hình riêng IT. Kết quả cuối ghi dưới đây.

### Kết quả cuối, giới hạn và bước tiếp theo

- PostgreSQL rerun: **170 tests PASS**, 0 failure/error/skip, **BUILD SUCCESS**, PostgreSQL 16.15; kết thúc 2026-11-03 17:03 Asia/Bangkok. Kết hợp với **498 backend tests PASS** ở lượt trước, increment đã qua các bộ kiểm tra liên quan. Không tuyên bố toàn bộ lệnh verify đầu đã thành công; failure 429 và cách sửa fixture được giữ ở trên.
- Logs trong workspace chat: `work/pause-before-20261103.log` (regression trước sửa), `work/pause-full-verify-20261103.log` (backend PASS/JAR và fixture IT fail), `work/pause-postgres-verify-20261103.log` (170 IT PASS). Test luồng correction/XP mới dùng H2; suite PostgreSQL chạy các HTTP/migration/ownership/restart tests hiện có, không gán nhầm test H2 là test PostgreSQL mới.
- Hash cuối: toàn bộ **452 file** nguồn/pom của snapshot khớp working tree, không có file mới ngoài snapshot hoặc source drift. Snapshot lần này đã bao gồm `WeeklyCoachFeedbackHttpTests.java` và các nguồn hiện có; gap nguồn thêm đồng thời của lượt sáng đã được khép lại cho snapshot này.
- `git diff --check` các file tracked sửa trong phiên và whitespace docs/StreakConsumerTests untracked: PASS, chỉ warning LF/CRLF. Không chạy frontend do không đổi UI; không reset/stage/commit, deploy hoặc migrate DB người dùng. Giữ nguyên các thay đổi không liên quan.
- Không có blocker mới còn tồn tại cho increment. SMTP/OAuth/payment thật và kiểm chứng staging/backup vẫn là các việc ngoài chưa hoàn tất; không retry khi chưa có credentials.
- Bước tiếp theo: tiếp tục ưu tiên 2 với chính sách timezone changes (ngày bị lùi/tiến khi đổi timezone) và snapshot đầu tiên khi check-in bù; giữ các snapshot hiện có và không đoán lịch trước observation. Bổ sung các biên pause dài/qua cửa sổ đọc khi thay đổi liên quan cần đến, thay vì xây lại bridge đã có. Browser/mobile history, onboarding và release gates vẫn còn mở.
- Project chưa hoàn tất trong phạm vi lõi. Giữ lịch 5 giờ; không mở rộng các AI tạm dừng hoặc tự bật weekly provider.

## Phiên tự động 2026-11-04 — snapshot lịch cho check-in bù có history

- Đầu phiên đọc ưu tiên hiện hành và tiến độ, kiểm tra Git status (848 entries), HEAD `6d08335`, không có AGENTS.md áp dụng. Giữ nguyên history UI, pause bridge, accounting và các thay đổi local khác; không triển khai lại phần đã hoàn tất.
- Tiếp tục ưu tiên 2: check-in mới trước đây luôn snapshot target/weekday hiện tại, kể cả khi history đã ghi rõ lịch của ngày được chọn. Chọn chính sách: dùng state có calendarDate gần nhất không sau ngày chọn, ID lớn nhất khi cùng ngày; chưa có state thì fallback lịch hiện tại, không suy diễn/backfill lịch cũ.
- Thêm `scheduleForNewCheckIn` read-only trong HabitStateHistoryService. Upsert chỉ gọi resolver khi tạo bản ghi mới, bên trong transaction đã khóa owner và sau pause/ownership guard. Batch hôm nay dùng cùng upsert hiện có. Constructor nội bộ nhận lịch snapshot; constructor cũ giữ hành vi cho các caller hiện có; không thêm setter hoặc API nhận snapshot từ client.
- Existing check-ins, correction, note edits và retry không được tính lại snapshot, kể cả legacy null. Không thay quy tắc snapshot điểm/phạt, không suy diễn reward quá khứ. Lịch sử timezone đổi lùi ngày vẫn là vấn đề riêng chưa giải quyết trong increment này.
- Files thay đổi: `src/main/java/com/selfforge/discipline/habit/HabitStateHistoryService.java`, `src/main/java/com/selfforge/discipline/checkin/CheckInService.java`, `DailyCheckIn.java`, `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`.

### Tests và kiểm tra

- Trước sửa: 3 regression cases FAIL đúng kỳ vọng: lịch lịch sử target 3 bị ghi thành target hiện tại 1/7; transition cuối cùng cùng ngày target 2 bị ghi thành 7. Không error/skip.
- Sau sửa, `mvn -B -Ppostgres-tests verify` trên bản copy riêng `work/self-forge-validation-20261104-backdated`: **506 backend tests PASS**, 0 failure/error/skip, **25 StreakConsumerTests PASS**, JAR đóng gói thành công. Coverage mới: lịch chọn thứ trong quá khứ, thay target theo cả hai hướng, loại trừ ngày sau, chọn transition cuối cùng cùng ngày, correction/retry/reload giữ ID và cả hai snapshots. Case fallback ngày chưa có history được giữ, đổi tên để thể hiện giới hạn rõ ràng. Các test mới dùng H2.
- Lệnh verify tổng thể **BUILD FAILURE** ở Failsafe vì Testcontainers không tìm được Docker. Report IT có 1 error lúc khởi tạo class; không phải 170 PostgreSQL cases đã chạy rồi fail, và không coi suite là skipped/pass.
- Log trong workspace chat: `work/backdated-before-20261104.log`, `work/backdated-full-verify-20261104.log`.
- Hash cuối: toàn bộ **464 file** nguồn/pom của snapshot khớp working tree, không source drift hoặc file thêm ngoài snapshot. Giữ riêng target kiểm chứng, không ghi đè shared target hoặc backend static assets.
- `git diff --check` các file tracked sửa trong phiên và whitespace của service/test/docs untracked: PASS, chỉ warning LF/CRLF. Không chạy frontend vì không đổi UI. Không stage/reset/commit hoặc deploy; không bật provider, thêm quota hay mở rộng AI.

### Blocker và bước tiếp theo

- **Blocker chính xác:** Docker daemon không khả dụng. Testcontainers báo `Could not find a valid Docker environment`; một lần chẩn đoán `docker info` xác nhận không kết nối được `npipe:////./pipe/dockerDesktopLinuxEngine`, Windows báo không tìm thấy pipe. Không retry Maven, pull image hoặc tự khởi động lại dịch vụ sau lỗi này.
- Cần Docker Desktop Linux engine hoạt động trước khi kiểm chứng PostgreSQL. Lần sau kiểm tra availability trước; nếu vẫn thiếu thì dừng an toàn và giữ trạng thái blocked verification. Khi Docker sẵn sàng, chạy Failsafe PostgreSQL trên snapshot còn khớp nguồn; nếu nguồn đổi thì tạo snapshot mới và chọn checks phù hợp. Không dùng 170 tests PASS ngày 2026-11-03 để xác nhận bản sửa mới.
- Sau khi đóng blocker kiểm chứng: tiếp tục chính sách timezone changes, nhất là observation mới có calendarDate lùi so với observation cũ. Giữ ngày/zone đã lưu và snapshot đã ghi; không tự suy diễn ngày trước history. Browser/mobile onboarding/history, credentials thật và release gates vẫn còn mở.
- Project chưa hoàn tất; increment mới đã qua backend tests nhưng chưa nghiệm thu PostgreSQL. Giữ lịch 5 giờ và phạm vi AI hiện hành.

## Phiên 2026-11-04 — vận hành closed beta: mã mời và triage phản hồi

- Đầu phiên kiểm tra Git status và ghi chú tiến độ. Working tree đang có số lượng lớn thay đổi tracked/untracked từ các phiên trước; không reset, checkout, stage, commit hoặc ghi đè phần không liên quan. Không có `AGENTS.md` áp dụng.
- Hoàn tất mã mời beta được quản lý bằng server: V49 tạo `beta_invite`; mã ngẫu nhiên chỉ trả một lần khi phát, DB chỉ giữ SHA-256 hash. Mỗi mã có nhãn, hạn dùng, giới hạn 1–1000 lượt, số lượt đã dùng và trạng thái thu hồi. Đăng ký lock/reserve mã rồi chỉ consume sau khi OTP hợp lệ, nên OTP sai không đốt lượt mã; giữ tương thích `BETA_INVITE_CODE` cũ. Tính năng tắt mặc định cho đến khi đặt `BETA_MANAGED_INVITES_ENABLED=true`.
- Hoàn tất inbox triage phản hồi beta: V50 bổ sung trạng thái `NEW/REVIEWED/PLANNED/RESOLVED/NOT_ACTIONED`, ghi chú nội bộ và thời gian review cho feedback. `GET/PATCH /api/operator/beta-feedback` dùng cùng operator key với metrics, có phân trang cursor theo ID và giới hạn 1–100. Endpoint không trả email/user ID; response cho người gửi không có trạng thái, ghi chú hoặc thời điểm review. Người dùng vẫn có thể xóa phản hồi của họ.
- Bổ sung script PowerShell operator: `scripts/manage-beta-invites.ps1` phát/list/thu hồi mã theo lô; `scripts/manage-beta-feedback.ps1` lọc inbox và đổi trạng thái. Cả hai yêu cầu HTTPS và key từ `SELF_FORGE_OPERATOR_KEY` hoặc tham số, không in key. Smoke production bổ sung kiểm tra inbox, privacy và triage.

### Files thay đổi trong increment

- Mới: `src/main/java/com/selfforge/discipline/auth/BetaInvite.java`, `BetaInviteRepository.java`, `BetaInviteService.java`, `src/main/java/com/selfforge/discipline/beta/BetaInviteOperatorController.java`, `BetaFeedbackOperatorController.java`, `src/main/java/com/selfforge/discipline/feedback/FeedbackReviewStatus.java`, `V49__managed_beta_invites.sql`, `V50__feedback_operator_review.sql`, các test `ManagedBetaInviteTests`, `ManagedBetaInviteVerificationTests`, `BetaFeedbackOperatorTests`, và hai operator scripts.
- Sửa: `AuthService`, `FeedbackSubmission`, `FeedbackSubmissionRepository`, `application.yml`, `smoke-production.ps1`, các assertion migration/production test. Một fixture raw-SQL của test deletion được bổ sung default fields của V50; đây là sửa fixture H2, không đổi schema production.

### Kiểm chứng

- `mvn -B test -Dtest=MigrationSchemaTests,ProductionSafetyTests,BetaFeedbackOperatorTests,ManagedBetaInviteTests`: **337 PASS**, 0 failure/error/skip.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT verify`: unit reports tổng **674 PASS**, Failsafe PostgreSQL 16 **170 PASS**, 0 failure/error/skip. V50 migrate/restart được xác nhận trên schema production.
- `docker build --tag selfforge:beta-feedback-triage .`: **PASS**, image `sha256:90a6759cc8c53fc4df9c368dacd8c40b36e7b136a887bd716371f3710c12b014`; Docker build chạy frontend lint/test/build và backend verify.
- `smoke-production.ps1` đã chạy image mới ở 512 MiB/1 CPU và tự dọn stack; output kết thúc không được runner giữ lại nên không dùng riêng lượt đó làm bằng chứng PASS. Thay vào đó, proof Docker cô lập trên chính image này đã **PASS**: V50 migrate, operator endpoint trả 404 khi sai key, inbox không lộ định danh, triage `PLANNED` lưu được, và response của người gửi không lộ state/note nội bộ. Container/database/network proof đã được xóa theo đúng tên.
- Parser PowerShell và `git diff --check` trên files increment: **PASS** (chỉ warning LF/CRLF thông thường).

### Blockers và bước tiếp theo

- Không deploy, push, commit hoặc migrate database người dùng. Việc nghiệm thu production thật còn cần quyền deploy và secret của môi trường thật.
- SMTP/Resend sender domain/API key, Google/Facebook OAuth credentials và merchant/payment provider chưa được cung cấp; các luồng thật tương ứng không được tuyên bố đã tích hợp. Không retry các provider khi chưa có credentials.
- Project chưa hoàn tất trong phạm vi public product: ưu tiên lõi kế tiếp theo `docs/DEVELOPMENT_PRIORITIES.md` vẫn là chính sách timezone transition và khoảng pause/legacy cho streak/check-in bù; không suy diễn lịch sử trước observation. Sau đó là nghiệm thu browser/mobile và staging/deploy có credentials.

## Phiên 2026-11-04 — lịch trạng thái khi đổi timezone lùi ngày

- Đầu phiên đọc ưu tiên, Git/progress và giữ nguyên working tree đang có nhiều thay đổi từ các lượt khác. Không reset, checkout, stage, commit, push, deploy, hay chạm vào container Redis đang chạy. Không có `AGENTS.md` áp dụng.
- Hoàn tất phần còn lại có ưu tiên cao nhất của lịch target/pause: khi người dùng chuyển về phía tây và một hành động mới hơn có `calendarDate` sớm hơn action cũ, action mới không còn biến mất sau khi sort theo ngày. Chính sách được chốt: một state chỉ có hiệu lực từ `calendarDate` của nó; trong tập state đủ điều kiện, thứ tự `recordedAt`, rồi ID khi cùng instant, quyết định action mới nhất. Action mới thay thế state hiệu lực từ ngày của chính nó trở đi. Check-in đã lưu giữ nguyên snapshot, không recalendar, backfill hay tạo ngày giả.
- Thêm `HabitStateTimeline` dùng chung và nối nó vào guard/snapshot của check-in mới, Dashboard, Reminder và Streak. Với persisted V43 event, `recordedAt` luôn có. Fallback date/ID chỉ giữ tương thích cho projection/fixture legacy thiếu mốc này, không làm thay đổi thứ tự event thật.
- Thêm regression H2 mô phỏng Kiritimati → Adak: state pause ngày hiện tại được ghi trước, state active/lịch 5 ngày có ngày lịch lùi nhưng instant muộn hơn được ghi sau. Test xác nhận resolver, guard check-in, snapshot của check-in mới và Dashboard đều dùng action muộn hơn. `StreakTests` fixture cũ thiếu `recordedAt` ban đầu làm comparator lỗi; sửa fallback và chạy lại, không nới schema production.
- Đồng bộ `docs/STREAK_RULES.md` và Javadoc repository để không còn mô tả sai rằng “hàng đầu theo calendar date” luôn là state hiệu lực.

### Files đã thay đổi trong increment

- Mới: `src/main/java/com/selfforge/discipline/habit/HabitStateTimeline.java`.
- Cập nhật: `HabitStateHistoryService.java`, `DashboardService.java`, `ReminderService.java`, `StreakService.java`, `HabitStateHistoryRepository.java`, `StreakConsumerTests.java`, `docs/STREAK_RULES.md`, `TASK_PROGRESS.md`.

### Kiểm chứng

- Sau fallback fixture: `mvn -B test -Dtest=StreakConsumerTests,StreakTests,ProductionSafetyTests` → **210 PASS**, 0 failure/error/skip.
- Kiểm tra schema/safety cùng regression: `mvn -B test -Dtest=MigrationSchemaTests,ProductionSafetyTests,StreakConsumerTests,StreakTests` → **378 PASS**, 0 failure/error/skip.
- Docker daemon khả dụng (`29.4.1`). Lượt `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT verify` tạo JAR và reports: **675 Surefire PASS**, **170 PostgreSQL 16 Failsafe PASS**, 0 failure/error/skip. Testcontainers tạm đã tự dọn; không sửa hoặc dừng `redis-infra`.
- `git diff --check` cho các tracked file của increment: PASS; chỉ có cảnh báo normal LF/CRLF của Git. Không có deploy production, không có smoke staging, nên không coi đây là xác minh triển khai.

### Rào cản và bước tiếp theo

- Không có rào cản kỹ thuật cho increment này. Dự án vẫn chưa hoàn tất public-product scope: SMTP/Resend sender/API key, Google/Facebook OAuth credentials, merchant/payment provider, quyền staging/deploy và backup/restore chưa có nên các tích hợp/triển khai thật không được tuyên bố hoàn tất hoặc retry.
- Bước lõi kế tiếp: nghiệm thu browser/mobile cho luồng onboarding → tạo habit → check-in đầu tiên → xem tiến độ → quay lại sau bỏ lỡ, gồm lịch sử habit, retry/lỗi mạng và accessibility. Giữ phạm vi AI chỉ weekly summary theo `docs/DEVELOPMENT_PRIORITIES.md`.

## Phiên 2026-11-04 — phản hồi auth khi browser không lưu được session

- Khởi đầu nghiệm thu browser/mobile: tab local hiện có trước hết báo offline vì không còn process ở cổng 18082. Chạy một stack tạm, tách dữ liệu: Spring Boot cổng 8080 với H2 **in-memory** `sf_ui_test`, Vite cổng 18082. Không dùng `data/discipline-db`, email/OAuth/AI/provider hay dữ liệu người dùng thật. API availability và proxy Vite trả 200; đăng ký và login với tài khoản test tổng hợp trả 201/200 qua HTTP cục bộ. Stack đã dừng sau kiểm tra; cổng 8080/18082 không còn listener.
- Giao diện đăng ký được quan sát có xác nhận mật khẩu, đồng ý Terms/Privacy và nút chỉ bật khi hợp lệ. Tuy nhiên in-app browser của công cụ không cấp storage chuẩn và không hoàn tất request mutation, nên không thể dùng nó làm bằng chứng end-to-end cho onboarding/sign-in; Chrome cũng không được kết nối cho lượt này. Đây là giới hạn môi trường nghiệm thu, không quy kết là lỗi API vì proxy/API đã xác minh riêng.
- Phát hiện UX liên quan: `AuthContext` chủ động chặn sign-in/sign-up khi storage không dùng được, nhưng LoginPage có thể hiển thị “Có lỗi xảy ra” chung. Thêm `authErrorMessage` để giữ detail từ API, chuẩn hóa sai email/mật khẩu và nêu rõ người dùng cần bật browser storage với cả lỗi storage rõ ràng, TypeError `getItem`/`setItem`/`removeItem`, hoặc trạng thái storage đã được AuthProvider xác nhận. Bổ sung bản dịch Việt/Anh. Điều này không gửi request khi preflight storage thất bại.

### Files đã thay đổi trong increment

- Mới: `frontend/src/utils/authError.js`.
- Cập nhật: `frontend/src/pages/LoginPage.jsx`, `frontend/src/utils/authSession.test.js`, `frontend/src/utils/language.js`, `TASK_PROGRESS.md`.

### Kiểm chứng

- `node --test src/utils/authSession.test.js` → **12 PASS**, gồm detail server, storage bị chặn, TypeError storage bọc và lỗi opaque khi provider đã báo storage unavailable.
- `npm test` → **505 PASS**, 0 fail/cancel/skip; test regression mới nằm trong command mặc định qua `authSession.test.js`.
- `npm run lint` → PASS. `npm run build -- --outDir ..\\work\\auth-storage-feedback-build-20261104-final` → PASS, 458 modules. Output build nằm ngoài source; chỉ có warning Vite rằng thư mục ngoài project không tự làm trống.
- `git diff --check` các file phiên này: PASS; warning LF/CRLF thông thường. Không deploy, commit, push, migration database người dùng hoặc gửi email.

### Rào cản và bước tiếp theo

- **Rào cản nghiệm thu UI chính xác:** in-app browser không có storage chuẩn và không gửi mutation login/register; Chrome browser không available trong công cụ. Vì vậy chưa tuyên bố đã nghiệm thu browser/mobile end-to-end, không dùng kết quả UI này để kết luận đăng nhập public hoạt động.
- Cần một browser/device có storage và network chuẩn (Chrome/Android/iOS hoặc staging) để chạy onboarding → tạo habit → check-in → dashboard/history → quay lại sau bỏ lỡ, gồm màn hẹp, keyboard, retry và accessibility. Cùng các rào cản external đã ghi: SMTP/OAuth/payment credentials, deploy authority và backup/restore.

## Phiên 2026-11-04 — đối chiếu release runbook với pipeline đang lưu

- Đầu phiên kiểm tra Git/progress và các workflow tracked. Giữ nguyên working tree lớn có thay đổi từ các lượt khác; không reset, stage, commit, push, deploy hay sửa workflow.
- Phát hiện `docs/DEPLOY_RUNBOOK.md` còn mô tả sai rằng push `main` tự kích hoạt deploy và không còn phản ánh số/loại kiểm tra hiện tại. Cấu hình tracked thực tế cho thấy `ci.yml` chạy trên push/PR và có thể được gọi lại; `deploy.yml` chỉ là `workflow_dispatch`, gọi CI rồi deploy **Fly.io** khi có `FLY_API_TOKEN`. `fly.toml` cũng hướng Fly.io.
- Cập nhật runbook để phân biệt rõ release pipeline trong repository với deployment Render ngoài repository. Không tạo/cấu hình Render, không đổi secret, không chạy Actions, Fly hoặc Render. File `.github/workflows/verify.yml` đang untracked nên không được coi là pipeline đã phát hành hoặc dùng làm căn cứ tài liệu.

### Files đã thay đổi trong increment

- `docs/DEPLOY_RUNBOOK.md`
- `TASK_PROGRESS.md`

### Kiểm tra

- Đối chiếu trực tiếp các trigger/job/secret trong `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` và đích hạ tầng trong `fly.toml`: khớp với runbook mới.
- Xác nhận repository không có `render.yaml`/`render.yml`; `actionlint` không được cài trong môi trường nên không tuyên bố đã lint GitHub Actions. Không sửa YAML workflow trong increment này.

### Rào cản và bước tiếp theo

- Chưa có quyền/secret để xác minh staging hay production, và public URL Render trước đó không được quản lý bằng cấu hình Render trong repository. Do đó không thể xác minh deploy, backup/restore hay smoke trên môi trường thật và không tuyên bố beta đã release.
- Việc ưu tiên tiếp theo vẫn là nghiệm thu browser/mobile chuẩn cho onboarding → tạo habit → check-in → dashboard/history → quay lại sau bỏ lỡ. Cần Chrome/Android/iOS hoặc staging có browser storage/network chuẩn; không retry in-app browser đã xác định không hỗ trợ mutation/storage chuẩn. SMTP/OAuth/payment và quyền deploy/backup vẫn là các phụ thuộc ngoài.

## Phiên 2026-11-04 — Render Blueprint không chứa secret cho beta

- Tiếp tục gap release được phát hiện ở phiên trước: URL public trước đó là Render, trong khi workflow GitHub tracked vẫn deploy Fly.io thủ công. Thêm `render.yaml` tại repo root theo Render Blueprint spec hiện hành, dùng Dockerfile hiện có và health check `/api/health`.
- Blueprint chỉ khai báo web service `selfforge-evol`, `SPRING_PROFILES_ACTIVE=prod` và origin public hiện có. Ba giá trị database bắt buộc dùng `sync: false`; file không tạo database, không chọn plan/cost, không nhúng credential và không bật email OTP, OAuth, thanh toán hay AI. Spring yêu cầu `DATABASE_URL` dạng JDBC `jdbc:postgresql://...`, cùng username/password riêng.
- Cập nhật runbook để Render Blueprint là cấu hình có thể review, đồng thời cảnh báo không sync trực tiếp vào production: sync có thể đổi service cùng tên và vẫn cần staging/backup/health/smoke thật. Không sync Blueprint, không truy cập Render, không deploy hoặc migrate dữ liệu người dùng.

### Files đã thay đổi trong increment

- Mới: `render.yaml`
- Cập nhật: `docs/DEPLOY_RUNBOOK.md`, `TASK_PROGRESS.md`

### Kiểm tra

- Đối chiếu các field `runtime: docker`, `dockerfilePath`, `dockerContext`, `healthCheckPath` và `envVars` với Render Blueprint reference chính thức ngày 04/11/2026. `healthCheckPath` chỉ được coi đạt khi Render gọi runtime thật; hiện mới là cấu hình đã kiểm tra.
- Chạy parser/format YAML và kiểm tra contract local sau khi tạo file; không chạy deploy hoặc test có thể tạo/quản lý resource Render.

### Rào cản và bước tiếp theo

- Cần chủ dự án quyết định/hỗ trợ trước Blueprint sync: staging hay service Render hiện hữu, PostgreSQL nào, giá plan, và đặt ba database secret qua dashboard. Không tự chọn vì có thể tạo chi phí hoặc ghi đè cấu hình service.
- Browser/mobile end-to-end chuẩn, SMTP/OAuth/payment thật, staging/deploy authority và backup/restore vẫn chưa được xác minh. Tiếp tục công việc lõi offline có thể kiểm tra; không tuyên bố bản beta đã deploy.

## Phiên 2026-11-04 — kiểm tra read-only native release

- Đọc native wrapper hiện có thay vì tạo lại: Capacitor đã có Android/iOS, app ID `com.selfforge.app`, HTTPS native scheme, Local Notifications và build mobile bắt buộc `VITE_API_URL` là HTTPS endpoint kết thúc `/api`. Không sửa metadata native, icon, bundle hay config provider.
- Chạy `npm.cmd run native:release:check` → Android versionCode 1 và iOS build number 1 cùng marketing version `1.0.0`. Chạy `npm.cmd run test:native` → **6 PASS**, 0 fail/cancel/skip; coverage gồm native OAuth URL/handoff và schedule reminder theo account/weekday.
- Đây là kiểm tra version/config utility, **không** là build APK/IPA hoặc nghiệm thu trên thiết bị. Không chạy `cap sync`, Gradle/Xcode, store upload hay thao tác deploy.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận kiểm tra); không có source mobile mới.

### Rào cản và bước tiếp theo

- Nghiệm thu mobile thật vẫn cần Android/iOS device/simulator có API HTTPS thật, cùng signing certificate, tài khoản Google Play/Apple Developer nếu phát hành store. Browser in-app hiện có không cung cấp storage/mutation chuẩn và Chrome không được kết nối, nên không retry nó như bằng chứng E2E.
- Không thể hoàn tất public beta ở đây nếu không có staging/browser-device chuẩn, database secrets và quyền sync/deploy. Các task code đã kiểm chứng cục bộ sẽ tiếp tục chỉ khi có một thiếu sót cụ thể, không lặp lại test hoặc module đã hoàn thành.

## Phiên 2026-11-04 — hành trình beta tối thiểu trên PostgreSQL đã migrate

- Chọn gap kiểm chứng còn lại của ưu tiên onboarding: `FirstUserJourneyTests` đã bảo vệ luồng API bằng H2, nhưng chưa có một test cùng đường đi chạy trên PostgreSQL/Flyway. Thêm một regression test vào `PostgresMigrationIT`, không đổi API hay nghiệp vụ production.
- Test mới chạy đăng ký tài khoản Free có Terms, đọc trạng thái Getting Started ban đầu, tạo habit `targetPerWeek=7`, lấy ngày dashboard theo account, tạo check-in COMPLETED kèm ghi chú, rồi xác nhận dashboard và checklist onboarding đã phản ánh dữ liệu lưu. Test không cấp Premium, không gọi email/OAuth/payment/AI và không phụ thuộc UI browser.

### Files đã thay đổi trong increment

- `src/test/java/com/selfforge/discipline/PostgresMigrationIT.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- Docker Engine: **29.4.1**.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#migratedPostgresSupportsNewUserHabitCheckInAndDashboardJourney verify`: report Failsafe PostgreSQL 16 có **1 PASS**, 0 failure/error/skip; test mới hiện trong report. Lệnh cũng tạo JAR `selfforge-0.0.1-SNAPSHOT.jar`.
- Surefire reports của đúng lượt Maven: **675 PASS**, 0 failure/error/skip. Đây là số report của lifecycle đã chạy; Failsafe chỉ được lọc theo một test mới nên không gán thành full PostgreSQL suite 170 tests.
- `git diff --check` cho source test, Render/runbook và progress: PASS; chỉ warning LF/CRLF thường thấy.

### Rào cản và bước tiếp theo

- Điều này xác minh API/database production-like, không thay thế browser/mobile E2E với thao tác người dùng thật. Điểm chặn đó vẫn cần Chrome/Android/iOS hoặc staging có storage/network chuẩn; không retry in-app browser hiện tại vì nó đã không hỗ trợ mutation/storage chuẩn.
- SMTP/OAuth/payment credentials, staging Render database secrets, quyền deploy/sync và backup/restore thật vẫn là phụ thuộc ngoài. Không tuyên bố beta đã public/deploy.

## Phiên 2026-11-04 — thử nghiệm browser chuẩn bị dừng an toàn

- Để không lặp lại in-app browser thiếu storage/mutation, kiểm tra máy cục bộ có Microsoft Edge. Dựng stack tạm tách biệt tại `127.0.0.1:18084` (Vite) và `127.0.0.1:18085` (Spring Boot + H2 in-memory `sf_edge_e2e`), dùng CORS riêng, không dùng `data/discipline-db`, Docker/PostgreSQL/Render hay provider bên ngoài.
- Edge mở được nhưng first-run dẫn tới Windows Default Apps/browser-settings prompt. Không chấp nhận, đổi hay bypass bất kỳ setting nào. Ngay khi Computer Use báo có input người dùng trong cửa sổ Edge, dừng mọi browser input theo chính sách an toàn; vì vậy không gán kết quả pass/fail cho onboarding UI.
- Dừng Vite và Spring Boot bằng Ctrl+C, sau đó xác nhận không còn listener ở hai cổng tạm. Không có account/dữ liệu thật hoặc email nào được tạo/gửi.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận blocker và cleanup); không thay source app.

### Rào cản và bước tiếp theo

- Browser E2E vẫn chưa nghiệm thu: cần một browser profile có thể dùng mà không bị prompt settings, hoặc Android/iOS/staging. Không tự thay đổi setting browser/Windows và không tiếp tục điều khiển Edge sau khi phát hiện input người dùng.
- Các kết quả API PostgreSQL ở phần trên vẫn hợp lệ, nhưng không thay thế kiểm thử tương tác người dùng. Deploy/SMTP/OAuth/payment/backup thật vẫn phụ thuộc credentials và quyền môi trường.

## Phiên 2026-11-04 — không thể khởi tạo browser profile E2E tách biệt

- Thử chuẩn bị lại H2/Vite cô lập ở `18085`/`18084` để mở Edge với `--user-data-dir` riêng, `--no-first-run` và URL local. Mục đích là tránh prompt Default Apps mà không đụng browser profile hiện hữu hay setting hệ thống.
- Runtime policy chặn `Start-Process` của Edge **trước khi process browser được tạo**. Không retry bằng shell/UI workaround, không sửa policy hoặc setting. Vite/Spring Boot tạm đã dừng; kiểm tra cổng xác nhận `TEMP_E2E_STACK_STOPPED`.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (blocker chính xác); không thay source app hoặc browser/system setting.

### Rào cản và bước tiếp theo

- E2E browser/device vẫn cần browser profile mà môi trường cho phép khởi tạo hoặc một Chrome/Android/iOS/staging do chủ dự án cung cấp. Không có cơ hội thành công hợp lý để tự retry trong runtime hiện tại.
- Tiếp tục chỉ với công việc code/test không cần browser thật; không coi API/DB tests là nghiệm thu giao diện.

## Phiên 2026-11-04 — tự dọn phiên đăng nhập hết hạn

- Thêm tác vụ nền `AuthSessionCleanup`: sau một phút kể từ khi chạy và sau đó theo chu kỳ một giờ mặc định, tác vụ xóa các dòng session có `expiresAt` trước thời điểm của application clock. Phiên còn hiệu lực không bị đụng tới; kiểm tra xác thực vẫn từ chối session hết hạn ngay cả trước lượt dọn tiếp theo.
- Bổ sung derived delete `deleteByExpiresAtBefore` vào repository và cấu hình `AUTH_SESSION_CLEANUP_DELAY_MS` (mặc định 3.600.000 ms) để có thể điều chỉnh ở môi trường deploy mà không sửa source. Dùng `Clock` chung để test xác định, không tạo timer/worker ngoài Spring hoặc dịch vụ bên thứ ba.

### Files đã thay đổi trong increment

- Mới: `src/main/java/com/selfforge/discipline/auth/AuthSessionCleanup.java`
- Mới: `src/test/java/com/selfforge/discipline/auth/AuthSessionCleanupTests.java`
- Cập nhật: `src/main/java/com/selfforge/discipline/auth/AuthSessionRepository.java`, `src/main/resources/application.yml`, `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=AuthSessionCleanupTests` → **1 PASS**, 0 failure/error/skip; xác nhận exact cutoff từ application clock và số dòng được repository trả về.
- `mvn -B test -Dtest=ProductionSafetyTests#securityHeadersAreSetOnEveryResponse` → **1 PASS**, 0 failure/error/skip; Spring Boot context khởi động được với scheduled bean và repository query mới, đồng thời bảo toàn kiểm tra security header mục tiêu.
- `mvn -B verify` → Surefire **676 PASS**, 0 failure/error/skip (60 report suites); build lifecycle hoàn tất. Cảnh báo unchecked có sẵn ở `WeeklyInsightTests` và cảnh báo Mockito dynamic-agent của JDK được ghi nhận, không có test fail.
- `git diff --check` cho các file source/config/test vừa đổi → PASS (chỉ có warning CRLF bình thường từ Git, không có whitespace error).

### Rào cản và bước tiếp theo

- Không có rào cản code/test cục bộ cho thay đổi này. Đây là hygiene dữ liệu phía server, không thay thế browser/mobile E2E, SMTP/OAuth/payment thật, staging Render database, backup/restore hay quyền deploy.
- Ưu tiên còn lại để beta có thể release vẫn là nghiệm thu trên browser/device thực và staging có dữ liệu/secret tách biệt; không retry browser E2E trong runtime hiện tại vì profile khởi tạo đã bị policy chặn.

## Phiên 2026-11-04 — vá dependency frontend trước beta

- `npm audit --omit=dev --audit-level=high` phát hiện bốn lỗ hổng runtime mức cao trước khi sửa: Axios/follow-redirects và React Router. Nâng Axios lên `1.21.0`, React Router DOM lên `7.18.5`, đồng thời pin transitive `follow-redirects` `1.16.2` bằng override để lockfile không quay về bản có advisory.
- Đồng bộ các công cụ build với bản vá tương thích Node 24: Capacitor CLI `8.6.0`, Capacitor Assets `4.0.0` và Vite `8.3.5`. `package-lock.json` được npm tái tạo để đồng bộ đầy đủ manifest frontend đang tồn tại (bao gồm native tooling đã có), không sửa source tính năng hoặc native project.
- Audit runtime sau cập nhật trả **0 vulnerabilities**. Audit toàn bộ chỉ còn 7 advisory mức moderate trong chuỗi build native (`@capacitor/assets` → `@trapezedev/project`/`xcode` và tool transitive); chúng không nằm trong dependency runtime/browser. Một số không có bản vá không-breaking, nên không dùng `--force` để hạ/hỏng công cụ native.

### Files đã thay đổi trong increment

- Cập nhật: `frontend/package.json`, `frontend/package-lock.json`, `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd audit --omit=dev --audit-level=high` → **found 0 vulnerabilities**.
- `npm.cmd run native:release:check` → version native đồng bộ: `1.0.0`, Android 1, iOS 1.
- `npm.cmd test` → **505 PASS**, 0 fail/cancel/skip; `npm.cmd run lint` → PASS; `npm.cmd run build` → PASS với Vite `8.3.5`.
- `git diff --check` cho hai file dependency → PASS (chỉ warning CRLF thông thường, không có whitespace error).

### Rào cản và bước tiếp theo

- NPM báo không xóa được một thư mục binary tạm của Rolldown đang bị Windows khóa trong lúc cài; dependency đang dùng, test/lint/build đều chạy được, nên đây không phải blocker release. Không tự xóa hay dừng process đang có thể do người dùng chạy.
- Không có lỗ hổng runtime frontend mức high/critical theo audit hiện tại. Vẫn cần browser/device E2E và staging/deploy có secrets/database tách biệt để xác minh product ngoài local; các advisory moderate ở dev/native tooling nên được theo dõi trong đợt nâng major toolchain riêng.

## Phiên 2026-11-04 — Docker release preflight cục bộ

- Dùng Docker Engine `29.4.1` dựng image `selfforge:local-preflight` từ Dockerfile hiện tại. Build đi qua `npm ci --ignore-scripts`, toàn bộ frontend checks được Dockerfile gọi, Maven `verify`, rồi tạo runtime image Java 21 không chạy root.
- Khởi chạy duy nhất một container tạm `selfforge-preflight` trên `127.0.0.1:18086`, ép profile `dev` để không cần và không chạm credential/database production. Endpoint `/api/health` trả HTTP **200** với `{"status":"UP"}`. Dừng container tạm ngay sau smoke; Docker tự remove và cổng 18086 đã được xác nhận trống.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận preflight); không thay Dockerfile, source app, database hoặc cấu hình deploy.

### Kiểm chứng

- `docker build --progress=plain --tag selfforge:local-preflight .` → PASS; image `sha256:a612d5f3…`, 183,371,014 bytes.
- Local health smoke → `GET http://127.0.0.1:18086/api/health` = **200**, `{ "status": "UP" }`.
- Cleanup → container `selfforge-preflight` không còn, port 18086 không listener.

### Rào cản và bước tiếp theo

- Đây là build/smoke cục bộ bằng H2 tạm, không phải deploy staging/production hay migration trên database thật. Production profile vẫn cần database secret, staging/backup/restore, browser/device E2E và quyền sync/deploy từ chủ dự án.
- Image local được giữ lại có chủ đích để debug/re-run; không push image, không tạo service hoặc chi phí cloud.

## Phiên 2026-11-04 — xử lý advisory toolchain không phá vỡ

- Chạy `npm audit fix` **không dùng `--force`** để cập nhật các transitive tool build có bản vá tương thích: glob, minimatch, path-scurry và rimraf. Audit toàn bộ giảm từ 7 xuống **4 moderate**, không còn high/critical.
- Bốn advisory còn lại đều là `uuid@7.0.3` đi qua `@capacitor/assets` (dev dependency) → `@trapezedev/project` → `xcode`; `npm explain uuid` và `npm ls --omit=dev` xác nhận chúng không nằm trong production dependency tree. NPM chỉ đề xuất `--force` hạ `@capacitor/assets` về 1.0.0, nên không áp dụng vì có thể phá native toolchain.
- Dựng lại Docker image từ lockfile cuối cùng, image mới `sha256:7dfecf733afd…` (183,371,679 bytes). Smoke H2 tạm trên loopback tiếp tục trả `/api/health` HTTP 200; container đã dừng/xóa và cổng 18086 trống.

### Files đã thay đổi trong increment

- Cập nhật: `frontend/package-lock.json`, `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd run native:release:check` → Android/iOS vẫn đồng bộ version `1.0.0`/`1`.
- `npm.cmd test` → **505 PASS**; `npm.cmd run lint` và `npm.cmd run build` → PASS với Vite 8.3.5.
- `docker build --progress=plain --tag selfforge:local-preflight .` → PASS; image mới đã health-smoke pass và cleanup tạm pass.
- `git diff --check` cho dependency/progress → PASS (warning CRLF thông thường duy nhất).

### Rào cản và bước tiếp theo

- Không có high/critical advisory trong full audit. Bốn advisory moderate còn lại thuộc dev-only native asset generator; xử lý dứt điểm cần đánh giá/upstream update riêng, không phải force downgrade trong increment release hiện tại.
- Release public vẫn không thể được xác nhận chỉ bằng local image: cần staging DB/secret, migration/backup-restore, browser/device E2E và quyền deploy từ chủ dự án.

## Phiên 2026-11-04 — hồi quy PostgreSQL/Flyway đầy đủ

- Chạy full profile `postgres-tests` với Docker Engine đang chạy, không dùng database local/Render/Neon hay dữ liệu cá nhân. Failsafe tạo PostgreSQL Testcontainers riêng, thực hiện Flyway và test migration/API integration; container test tự quản lý bởi framework.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận kiểm chứng); không thay source, schema, migration hoặc dữ liệu.

### Kiểm chứng

- `mvn -B -Ppostgres-tests verify` → Surefire **676 PASS**, 0 failure/error/skip; Failsafe summary **171 PASS**, 0 failure/error/skip.
- `target/failsafe-reports/failsafe-summary.xml` được ghi mới với `completed=171`, `errors=0`, `failures=0`, `skipped=0`; không suy diễn kết quả từ report 1 test của lượt kiểm tra trước.

### Rào cản và bước tiếp theo

- Đây xác minh PostgreSQL/Flyway cô lập cục bộ, không thay thế migration/backup-restore trên staging với secret do chủ dự án quản lý.
- Các rào cản release còn lại không thể tự giải quyết chỉ từ repository: browser/device E2E chuẩn, staging PostgreSQL, SMTP/OAuth/payment credentials (nếu bật), và quyền sync/deploy/backup.

## Phiên 2026-11-04 — diễn tập backup/restore PostgreSQL cô lập

- Dựng PostgreSQL 16 tạm trên `127.0.0.1:15432`, khởi động production profile từ image local trên `127.0.0.1:18087` với JDBC database tạm. Flyway migrate thành công và `/api/health` trả 200. Chỉ tạo dữ liệu mẫu `backup-drill@example.invalid` và habit `Backup drill habit`.
- Chạy chính các script guarded `scripts/backup-postgres.ps1` và `scripts/restore-postgres-backup.ps1` bằng Docker tool. Backup custom có SHA-256 (136,206 bytes), restore được phép vào target database trống `sf_restore_drill` và tạo 53 public tables. Query sau restore xác nhận user/habit mẫu tồn tại, 50 row Flyway history, 1 user và 1 habit.
- Dừng hai container drill và xác nhận hai cổng loopback được giải phóng. Không chạm PostgreSQL local, Render, Neon, staging hay dữ liệu thật.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận diễn tập); không thay source, migration, deployment config hay database thật.

### Kiểm chứng

- Backup script tạo dump custom và checksum: SHA-256 `415d873b7ebe53b3b76cb6203b72538b30c592bae6606d4e146e4e4a06ed0e18`.
- Restore script → `publicTablesBefore=0`, `publicTablesAfter=53`.
- Query restore → `user=true`, `habit=true`, `flyway_history=50`, `app_user=1`, `habit=1`.
- Cleanup runtime → `selfforge-backup-drill-app` và `selfforge-backup-drill-db` đã remove; ports 15432/18087 không listener.

### Rào cản và bước tiếp theo

- Runtime policy chặn lệnh xóa filesystem của thư mục dump tạm **trước khi lệnh chạy**, nên không có cleanup nào bị thực hiện một phần. Hai file synthetic backup/checksum còn trong `work/backup-restore-drill/`; không chứa dữ liệu người dùng thật hoặc secret production và không được commit. Không tự retry/xóa bằng workaround.
- Diễn tập này chứng minh script trên dữ liệu PostgreSQL tạm, nhưng staging vẫn cần backup/restore với database/retention của nhà cung cấp, thời gian RTO/RPO do chủ dự án chốt, browser/device E2E và quyền deploy.

## Phiên 2026-11-04 — kiểm tra read-only URL Render hiện hữu bị timeout

- Dùng URL do chủ dự án đã cung cấp (`https://selfforge-evol.onrender.com/`) chỉ với GET read-only; không gửi form, không tạo account, không gửi secret, không deploy hoặc thay đổi cấu hình.
- `Invoke-WebRequest` cho `/api/health` và homepage không trả kết quả trong runtime hiện tại. Lượt `curl` độc lập với `--connect-timeout 10 --max-time 20` cũng timeout sau 20 giây với 0 byte nhận được.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận kết quả); không thay source, Render service hay dữ liệu.

### Kiểm chứng và rào cản

- Không thể kết luận service Render down hay healthy từ môi trường hiện tại: đây có thể là cold start/egress/runtime network và không có log Render để phân biệt.
- Không retry liên tục cùng URL. Cần kiểm tra deploy/log/health trực tiếp trên Render dashboard hoặc sau một release được chủ dự án cho phép. Local Docker, PostgreSQL, backup/restore và test suites vẫn là bằng chứng local riêng, không thay cho URL public.

## Phiên 2026-11-04 — production smoke đầy đủ trên image local

- Chạy `scripts/smoke-production.ps1 -Image selfforge:local-preflight -MemoryMb 512 -CpuLimit 1` với PostgreSQL/network/container hoàn toàn disposable do script tạo tên ngẫu nhiên và tự cleanup. Không kết nối service hay database deploy.
- Script PASS toàn bộ luồng: production startup/Flyway, frontend assets và SPA deep links, registration/habit/check-in retry/XP, feedback private + aggregate beta metrics có khóa operator, stale writes, habit schedule history, companion/challenge/focus, journal/goal/restart, export riêng tư, reminder pause/restore, account isolation, đổi mật khẩu thu hồi mọi phiên, login rate limit, logout và permanent account deletion.
- Readiness đạt sau 54.15 s lúc khởi động đầu và 47.15 s sau restart trong giới hạn 512 MiB/1 CPU. Script xác nhận không có container smoke còn lại sau `finally` cleanup.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận kiểm chứng); không thay source, image, database thật hoặc deploy configuration.

### Kiểm chứng

- Smoke log kết thúc bằng `PASS: production startup, migrations, frontend assets, ... permanent account deletion.`
- Docker cleanup sau smoke → không còn container tên `sf-smoke-*`.

### Rào cản và bước tiếp theo

- Đây là evidence production-like local mạnh hơn H2, nhưng không phải staging/public proof: URL Render vẫn timeout từ runtime hiện tại; browser/device E2E, staging secrets/backup retention và quyền deploy/sync cần được xác minh ở môi trường do chủ dự án quản lý.

## Phiên 2026-11-04 — capacity smoke cho quy mô beta 100 tài khoản

- Chạy lại `scripts/smoke-production.ps1` trên image production local với `-LoadUsers 100`, giới hạn 512 MiB/1 CPU. Sau toàn bộ regression smoke chuẩn, script seed 100 account disposable và chạy tối đa 10 workflow đồng thời: login, tạo habit batch, check-in COMPLETED, đọc XP, retry check-in, dashboard và weekly stats.
- Kết quả: **100/100 workflow pass**, 800 request kiểm tra, tổng 40.42 s, p95 **816.7 ms**, max **1137.17 ms**. Script xác nhận mỗi account có đúng một check-in sau retry; memory container sau workload **440.2 MiB / 512 MiB**. Container/database/network disposable tự cleanup thành công.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận capacity smoke); không thay source, hạ tầng cloud, database hay dữ liệu thật.

### Diễn giải và rào cản

- Đây là bằng chứng local production-like cho khoảng 100 tài khoản beta với concurrency giới hạn 10; không phải benchmark 100 người dùng đồng thời, không đo network Internet/Render/SMTP/AI/payment, và không phải SLA production.
- Có khoảng 72 MiB headroom trong limit 512 MiB sau workload. Trước tăng mức concurrency hoặc bật provider nặng, cần chạy staging load test có quan sát RAM/CPU/latency thật và đặt cảnh báo.
- Browser/device E2E, staging secret/database/backup retention, public Render health và quyền deploy vẫn là các phụ thuộc ngoài repository.

## Phiên 2026-11-05 — managed beta invitation smoke

- Sửa fixture của `scripts/smoke-production.ps1`: khi chạy `-ManagedBetaInvites`, luồng kiểm tra account isolation nay tạo một invite một-lượt riêng qua operator endpoint cho tài khoản thứ hai. Trước đó fixture tái sử dụng invite đầu tiên đã bị tiêu thụ, nên có thể báo lỗi sai dù policy managed beta của ứng dụng hoạt động đúng. Không thay đổi source ứng dụng hay làm yếu invite policy.
- Chạy smoke managed beta trên image production local với giới hạn 512 MiB/1 CPU. Toàn bộ luồng PASS, bao gồm registration với invite, private feedback/aggregate metrics, persistence sau restart, account isolation, đổi mật khẩu thu hồi session, login throttling, logout và xóa account vĩnh viễn. Readiness: 47.07 s lúc khởi động, 56.72 s sau restart.

### Files đã thay đổi trong increment

- `scripts/smoke-production.ps1` (sửa fixture isolation của managed beta).
- `TASK_PROGRESS.md` (ghi nhận kiểm chứng và rào cản cleanup).

### Kiểm chứng

- `scripts/smoke-production.ps1 -Image selfforge:local-preflight -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180 -ManagedBetaInvites` → log kết thúc bằng `PASS: production startup, migrations, frontend assets, ... permanent account deletion.`
- Toàn bộ assertion managed-beta và application smoke hoàn thành trước bước cleanup.
- PowerShell AST parse của `scripts/smoke-production.ps1` → PASS.
- `mvn -B test -Dtest=AuthSessionCleanupTests,ProductionSafetyTests` → **168 PASS**, 0 failure/error/skip (1 cleanup scheduling test, 167 production-safety tests).

### Rào cản và bước tiếp theo

- Docker Engine đã dừng ngay trong bước `finally` cleanup sau khi smoke PASS, nên không thể xác minh cleanup ở thời điểm đó. Sau khi engine hoạt động lại, kiểm tra read-only `docker ps -a --filter name=sf-smoke-` không trả container nào; tài nguyên disposable của smoke hiện đã được xác minh là không còn.
- Staging/public deploy, browser/device E2E và provider credentials vẫn chưa được xác minh; không có dữ liệu thật, secret hoặc cấu hình cloud nào bị thay đổi trong increment này.

## Phiên 2026-11-05 — xác minh cleanup smoke và Android wrapper

- Sau khi Docker Engine hoạt động lại, kiểm tra read-only không tìm thấy container `sf-smoke-*`; cleanup của managed-beta smoke được xác minh hoàn tất.
- Chạy `node frontend/scripts/verifySpaRoutes.mjs` → **PASS**, xác nhận Spring SPA fallback bao phủ 20 React routes hiện có.
- Thử build Android debug bằng `frontend/android/gradlew.bat assembleDebug --no-daemon`. Gradle dừng trước khi compile, không tạo APK; log daemon nêu chính xác `SDK location not found` vì không có `ANDROID_HOME`/`ANDROID_SDK_ROOT` và `frontend/android/local.properties` chưa có `sdk.dir` hợp lệ.

### Files đã thay đổi trong increment

- `TASK_PROGRESS.md` (ghi nhận cleanup và rào cản Android SDK); không thay đổi source, Gradle config, native metadata hoặc local machine configuration.

### Rào cản và bước tiếp theo

- Android debug/release build, emulator/device test và Play Store signing không thể được xác minh cho đến khi máy có Android SDK hợp lệ được cấu hình bởi chủ dự án. Không tự cài SDK, tạo `local.properties`, đổi environment variable hoặc tạo signing key vì đó là thay đổi môi trường/credential ngoài scope repository.
- Browser/device E2E chuẩn, staging/public deploy, database secrets, SMTP/OAuth/payment credentials vẫn là các phụ thuộc ngoài. Các test local/Docker đã PASS không được xem là thay thế cho chúng.

## Phiên 2026-11-05 — nền tảng payment Premium tắt mặc định

- Thêm domain payment độc lập: catalog giá server-side bằng VND cho `MONTHLY`, `YEARLY`, `LIFETIME`; order có reference ngẫu nhiên; event có provider transaction ID duy nhất để callback lặp không cấp Premium hai lần. Giá, tiền tệ và thời hạn entitlement không nhận từ browser.
- Thêm Flyway `V51__payment_orders.sql`: `payment_order` và `payment_event` tách biệt. Event không lưu nội dung chuyển khoản hoặc thông tin người gửi; callback không khớp chỉ được giữ ở `REVIEW`, không đổi Premium.
- Thêm adapter webhook SePay có API key constant-time comparison và reference được giới hạn định dạng. API order yêu cầu session trước khi phản hồi trạng thái tính năng. Cả order và webhook đều **tắt mặc định**; webhook chỉ khởi động khi có đồng thời order flag, merchant key và account nhận hợp lệ.
- Điều chỉnh xóa tài khoản: xóa payment order cá nhân trong cùng transaction, còn payment event được database tách `payment_order_id` để giữ bản ghi đối soát không còn liên kết với user. Có regression HTTP cho luồng đã cấp Premium rồi xóa tài khoản.
- Cập nhật assertion schema/Flyway V51. PostgreSQL restart test lần đầu phát hiện hai assertion version cũ 50; chỉ sửa expectation phù hợp V51 rồi chạy lại test đó thành công.

### Files đã thay đổi trong increment

- `src/main/java/com/selfforge/discipline/payment/PaymentPlan.java`, `PaymentOrderStatus.java`, `PaymentEventDisposition.java`, `PaymentOrder.java`, `PaymentEvent.java`, `PaymentOrderRepository.java`, `PaymentEventRepository.java`, `PaymentOrderService.java`, `PaymentSettings.java`, `PaymentOrderController.java`, `SePayWebhookController.java`
- `src/main/resources/db/migration/postgresql/V51__payment_orders.sql`, `src/main/resources/application.yml`
- `src/main/java/com/selfforge/discipline/auth/AccountDeletionService.java`
- `src/test/java/com/selfforge/discipline/payment/PaymentOrderServiceTests.java`, `PaymentFeatureDisabledTests.java`, `MigrationSchemaTests.java`, `ProductionSafetyTests.java`, `PostgresMigrationIT.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=PaymentOrderServiceTests,PaymentFeatureDisabledTests` → **6 PASS**, 0 failure/error/skip. Bao phủ server catalog, wrong amount review, lifetime, webhook key, immediate entitlement, replay callback, account deletion và fail-closed mặc định.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#productionStartupAndRestartPreserveData test-compile failsafe:integration-test failsafe:verify` → PostgreSQL 16/Flyway V51 **1 PASS**, 0 failure/error/skip; production-profile restart giữ dữ liệu và migration không chạy lại.
- `mvn -B test -Dtest=MigrationSchemaTests,ProductionSafetyTests` → **335 PASS**, 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Không bật `PAYMENT_ORDERS_ENABLED` hoặc `SEPAY_WEBHOOK_ENABLED`: chưa có merchant account, sandbox, webhook key, account nhận, QR/checkout UI, reconciliation vận hành, refund policy hoặc staging callback xác thực. Không có giao dịch tiền thật hoặc Premium bán thật được thực hiện trong increment này.
- Bước hợp lý tiếp theo khi chủ dự án có sandbox SePay là cấu hình secret ngoài Git, test callback sandbox trên staging, đối soát một giao dịch mô phỏng và sau đó mới thiết kế UI checkout/QR. Cần quyết định chính sách refund/chargeback và retention ledger trước public payment.

## Phiên 2026-11-05 — chống order Premium trùng khi retry

- Bổ sung policy trên service: cùng tài khoản gửi lại yêu cầu của **cùng gói** khi order PENDING còn hạn sẽ nhận lại chính reference cũ; không tạo thêm lệnh chuyển khoản. Khi chủ động chọn gói khác, reference PENDING cũ chuyển `CANCELLED` rồi mới tạo order mới.
- Callback đến muộn cho reference đã hủy chỉ sinh event `REVIEW`, không thể cấp Premium. User được lock trước khi tìm/tạo order, nên các request tạo order đồng thời của cùng tài khoản đi qua cùng quyết định này.
- Lượt full Surefire trước thay đổi này đã tạo reports **514 PASS**, 0 failure/error/skip. Vì policy retry được thêm sau lượt đó, không gán kết quả full đó cho code mới; code mới được kiểm chứng bằng nhóm payment trực tiếp bên dưới.

### Files đã thay đổi trong increment

- `src/main/java/com/selfforge/discipline/payment/PaymentOrder.java`, `PaymentOrderRepository.java`, `PaymentOrderService.java`
- `src/test/java/com/selfforge/discipline/payment/PaymentOrderServiceTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- Lần đầu regression mới có 1 assertion fail vì entity test bị detach sau transaction và vẫn giữ state cũ; không phải trạng thái database. Sửa assertion đọc lại repository, không sửa hành vi production.
- `mvn -B test -Dtest=PaymentOrderServiceTests,PaymentFeatureDisabledTests` → **7 PASS**, 0 failure/error/skip. Bao phủ retry cùng gói, đổi gói, payment đến muộn cho order đã hủy, cùng toàn bộ rule webhook/fail-closed trước đó.

### Rào cản và bước tiếp theo

- Vẫn chưa có provider sandbox/secret và chưa mở UI checkout. Không bật flag, không suy diễn rằng transfer thật hoặc refund đã được xác minh.

## Phiên 2026-11-06 — hàng đợi đối soát payment chỉ-đọc

- Thêm `GET /api/operator/payments/review`: chỉ hiển thị event `REVIEW` cho người có `PAYMENT_OPERATOR_KEY` riêng; thiếu hoặc sai key trả `404`. Endpoint không dùng chung khóa beta metrics và không có API thủ công cấp/hủy Premium.
- Hàng đợi chỉ trả metadata cần đối soát: provider transaction ID, reference, số tiền nhận được, số tiền/gói kỳ vọng, trạng thái order và lý do review. Không trả user ID, email, account người gửi hay nội dung chuyển khoản.
- Thêm các mã review không nhạy cảm vào ledger: reference không khớp, transfer không hợp lệ, order không còn payable, sai tiền và tài khoản Lifetime đã có quyền. Điều này cho phép xử lý support có căn cứ mà không giữ raw bank content.

### Files đã thay đổi trong increment

- `src/main/java/com/selfforge/discipline/payment/PaymentOperatorAccess.java`, `PaymentOperatorController.java`, `PaymentReviewReason.java`
- `src/main/java/com/selfforge/discipline/payment/PaymentEvent.java`, `PaymentEventRepository.java`, `PaymentOrderService.java`
- `src/main/resources/application.yml`, `src/main/resources/db/migration/postgresql/V51__payment_orders.sql`
- `src/test/java/com/selfforge/discipline/payment/PaymentFeatureDisabledTests.java`, `PaymentOperatorTests.java`, `PaymentOrderServiceTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=PaymentOrderServiceTests,PaymentFeatureDisabledTests,PaymentOperatorTests` → **8 PASS**, 0 failure/error/skip. Bao phủ queue chỉ-đọc, khóa operator riêng, endpoint ẩn khi chưa có key, không lộ định danh tài khoản, reason/expected amount, replay, đổi gói và webhook fail-closed.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#productionStartupAndRestartPreserveData test-compile failsafe:integration-test failsafe:verify` → PostgreSQL 16/Flyway V51 **1 PASS**, 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Chưa có sandbox merchant, callback thật, `PAYMENT_OPERATOR_KEY` vận hành, QR/checkout UI, job đối soát provider khi mất webhook, refund policy hay quy trình hỗ trợ. Không cấu hình/ghi secret, không bật flag và không coi hàng đợi local là khả năng thu tiền thật.

## Phiên 2026-11-06 — liên kết OAuth tường minh, không takeover bằng email

- Sửa policy OAuth: một provider subject đã liên kết vẫn đăng nhập đúng tài khoản cũ, nhưng provider subject **mới** có email trùng tài khoản SelfForge hiện hữu không còn tự nhập vào tài khoản đó. Luồng trả conflict và yêu cầu người dùng đăng nhập vào tài khoản hiện hữu để liên kết tường minh.
- Thêm `POST /api/auth/oauth/{provider}/link/start`: yêu cầu session hiện tại và mật khẩu hiện tại trước khi redirect sang provider. State chỉ sống một lần trong 10 phút, gắn với user ID và fingerprint của password hash; đổi mật khẩu trong lúc chờ callback khiến link hết hiệu lực.
- Callback link xác thực provider subject trước rồi mới tạo `OAuthIdentity`; không cấp session OAuth mới, không dùng email provider để ghép tài khoản, và không tự đổi email local. Một subject hoặc một provider đã thuộc tài khoản khác đều bị từ chối.
- Thêm Flyway `V52__oauth_explicit_linking.sql` cho state link user/fingerprint; foreign key tự xoá state đang chờ khi account bị xoá. Cập nhật các assertion version/migration count thành V52.

### Files thay đổi trong increment

- `src/main/java/com/selfforge/discipline/auth/AuthService.java`, `OAuthLoginController.java`, `OAuthLoginService.java`, `OAuthLoginState.java`, `OAuthLoginStateStore.java`
- `src/main/resources/db/migration/postgresql/V52__oauth_explicit_linking.sql`
- `src/test/java/com/selfforge/discipline/auth/OAuthLoginStoreTests.java`, `MigrationSchemaTests.java`, `ProductionSafetyTests.java`, `PostgresMigrationIT.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=OAuthLoginStoreTests` → **6 PASS**, 0 failure/error/skip. Bao phủ state single-use, giữ link state, takeover qua email bị chặn, ownership của provider subject và password đổi sau khi bắt đầu link.
- `mvn -B test -Dtest=MigrationSchemaTests` → **168 PASS**, 0 failure/error/skip; H2/Flyway áp dụng 52 migration và schema JPA validate.
- `mvn -B test -Dtest=ProductionSafetyTests` → **167 PASS**, 0 failure/error/skip; endpoint link cần auth và trả fail-closed khi provider chưa cấu hình.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#productionStartupAndRestartPreserveData test-compile failsafe:integration-test failsafe:verify` → PostgreSQL 16/Flyway V52 **1 PASS**, 0 failure/error/skip.
- `git diff --check` → không có whitespace error (chỉ có cảnh báo CRLF bình thường của Git cho worktree Windows).

### Rào cản và bước tiếp theo

- Google/Facebook vẫn chưa được bật: thiếu OAuth client ID/secret, redirect URL đã đăng ký và staging callback test. Không có credential thật, provider redirect hoặc browser/device E2E nào đã được thực hiện.
- Profile UI cho link đã được thêm và chỉ hiển thị khi server báo provider đang khả dụng; native link cũng có handoff riêng từ V53. Khi có provider sandbox, bước tiếp theo là cấu hình secret ngoài Git và chạy callback/link E2E trên staging/device.

## Phiên 2026-11-06 — UI liên kết OAuth theo feature availability

- Thêm card “Liên kết đăng nhập mạng xã hội” trong Profile, nhưng card hoàn toàn ẩn khi API báo Google/Facebook chưa cấu hình hoặc không lấy được availability. Do đó bản beta mặc định không quảng bá provider chưa sẵn sàng.
- Khi provider được bật, người dùng phải nhập mật khẩu hiện tại rồi mới gọi endpoint link đã có re-authentication ở backend. Mật khẩu chỉ giữ trong React state, được xóa ngay cả khi bắt đầu thất bại, và không ghi localStorage/log/query string.
- Frontend chỉ cho điều hướng tới authorization URL HTTPS có độ dài hữu hạn, không có username/password. Sau callback thành công, toast xác nhận hiển thị một lần và URL được làm sạch. Email SelfForge không bị thay đổi bởi thông tin provider.
- Với native Capacitor, UI chỉ thông báo luồng link chưa sẵn sàng thay vì mở browser rồi mắc kẹt, vì native callback/handoff cho link chưa được triển khai. Login OAuth native hiện hữu không bị thay đổi.

### Files thay đổi trong increment

- `frontend/src/components/OAuthLinkSettings.jsx`
- `frontend/src/utils/oauthLink.js`, `frontend/src/utils/oauthLink.test.js`
- `frontend/src/pages/ProfilePage.jsx`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `node --test src/utils/oauthLink.test.js` → **1 PASS**; URL relative/HTTP/credential-bearing/malformed/quá dài bị từ chối.
- `npm.cmd run lint` → PASS; `npm.cmd run build` → PASS (Vite 8.3.5).
- `npm.cmd test` → **505 PASS**, 0 failure/cancel/skip. Test mới được chạy focused vì script suite hiện hành liệt kê tường minh các file test.

### Rào cản và bước tiếp theo

- Không có OAuth provider thật nên không thể nhìn thấy card trong runtime hiện tại hay chạy callback E2E; đây không phải bằng chứng Google/Facebook login/link hoạt động ngoài thực tế.
- Cần Google/Facebook client ID/secret, redirect URL staging và một browser/device chuẩn để thực hiện một link thành công, xác minh provider subject đã có/đã thuộc tài khoản khác, và quyết định native handoff riêng trước khi mở tính năng này trên mobile.

## Phiên 2026-11-06 — native OAuth link, không thể đổi thành login

- Thêm Flyway `V53__oauth_native_link_handoff.sql`: mỗi native handoff được gắn purpose `LOGIN` hoặc `LINK`. Dữ liệu cũ default `LOGIN`; database chỉ chấp nhận hai giá trị này.
- Native link bắt đầu chỉ sau session hiện tại + mật khẩu hiện tại. Callback provider liên kết subject với đúng account đã được pin trong OAuth state, rồi hoàn tất handoff purpose `LINK` cho account đó. App chỉ poll `POST /api/auth/oauth/native/link/complete` với session hiện hữu; response chỉ nói `LINKED`, không trả token và không thể tạo session mới.
- Endpoint login completion từ chối handoff `LINK`; owner khác cũng không consume được handoff. Mismatch purpose không xóa handoff hợp lệ của owner, nên request sai không gây denial-of-service cho flow đang chờ.
- Cập nhật Profile Capacitor: mở provider trong secure browser, poll completion, đóng browser khi success/failure và xóa mật khẩu/handoff khỏi React state. Thông báo callback native phân biệt “Đăng nhập” và “Liên kết”.

### Files thay đổi trong increment

- `src/main/java/com/selfforge/discipline/auth/OAuthNativeHandoffPurpose.java`, `OAuthNativeHandoff.java`, `OAuthNativeHandoffStore.java`, `OAuthLoginStateStore.java`, `OAuthLoginService.java`, `OAuthLoginController.java`
- `src/main/resources/db/migration/postgresql/V53__oauth_native_link_handoff.sql`
- `src/test/java/com/selfforge/discipline/auth/OAuthLoginStoreTests.java`, `MigrationSchemaTests.java`, `ProductionSafetyTests.java`, `PostgresMigrationIT.java`
- `frontend/src/components/OAuthLinkSettings.jsx`, `frontend/src/pages/ProfilePage.jsx`
- `TASK_PROGRESS.md`

### Kiểm chứng

- Sau correction mismatch purpose, `mvn -B test -Dtest=OAuthLoginStoreTests,ProductionSafetyTests,MigrationSchemaTests` → **342 PASS** (7 OAuth + 167 safety + 168 migration), 0 failure/error/skip; test mới che chính nhánh đã đổi.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#productionStartupAndRestartPreserveData test-compile failsafe:integration-test failsafe:verify` → PostgreSQL 16/Flyway V53 **1 PASS**, 0 failure/error/skip.
- `node --test src/utils/oauthLink.test.js src/utils/nativeOAuth.test.js` → **2 PASS**; `npm.cmd run lint` và `npm.cmd run build` → PASS; `npm.cmd test` → **505 PASS**, 0 failure/cancel/skip.

### Rào cản và bước tiếp theo

- Chưa có Google/Facebook app credentials hay device/staging redirect để thử provider thực, Capacitor Browser thật hoặc polling end-to-end. Không tuyên bố native OAuth hoạt động trên điện thoại chỉ từ code/fixture cục bộ.
- Trước public enable, cần test cả: account local trùng email provider (phải không takeover), subject đã gắn account khác (phải từ chối), đổi mật khẩu khi browser đang mở (phải hết hạn), app đóng/mở khi callback thành công và callback bị hủy/timeout. Credentials, domain redirect và một Android/iOS device vẫn là phụ thuộc ngoài.
- Production smoke cho V51–V53 đã qua trong lượt kế tiếp; xem mục bên dưới. Việc build đầu tiên từng timeout TLS ở Docker Hub không phải lỗi source, và retry chỉ được thực hiện sau yêu cầu tiếp tục mới của chủ dự án.

## Phiên 2026-11-06 — production smoke V53 trên image mới

- Docker Hub hoạt động lại. Build `selfforge:local-preflight-v53` từ source hiện tại thành công (image `sha256:15fa5a6a69ef…`); Dockerfile tự chạy frontend lint/test/build và backend verification trước khi tạo runtime image.
- Chạy `scripts/smoke-production.ps1` với image mới, PostgreSQL 16/network/containers hoàn toàn disposable, giới hạn **512 MiB / 1 CPU**. Không kết nối Render, database deploy, provider OAuth/email/payment hoặc dữ liệu người dùng thật.
- Smoke PASS: startup/Flyway V1–V53, SPA deep links/frontend assets, đăng ký và writes, feedback private + beta metrics khóa quyền, conflict profile/journal, habit schedule history, companion/challenge/focus, check-in retry/XP, restart/goal/reminder persistence, private export, account isolation, đổi mật khẩu thu hồi session, login throttling, logout và xóa account vĩnh viễn.

### Kiểm chứng

- `docker build --tag selfforge:local-preflight-v53 .` → PASS.
- `scripts/smoke-production.ps1 -Image selfforge:local-preflight-v53 -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180` → PASS. Readiness: **41.98 s** lúc khởi động và **39.59 s** sau restart.
- Kiểm tra read-only sau `finally` cleanup: không còn container tên `sf-smoke-*`.

### Giới hạn còn lại

- Đây là production-like local evidence, không phải staging/public deploy. OAuth provider thật, SMTP/payment, browser/device E2E, backup/restore của database managed và Render health vẫn chưa được xác minh; không coi smoke PASS là bằng chứng các tích hợp đó đã live.

## Phiên 2026-11-06 — cổng regression OAuth trong build release

- Thêm script `test:oauth` để chạy cùng lúc kiểm thử URL OAuth native và kiểm thử URL liên kết OAuth web. Nhờ đó regression của card liên kết Profile không còn chỉ được chạy thủ công/focused.
- Docker build release và workflow GitHub CI đều gọi cổng này trước frontend build. Cổng kiểm thử chỉ kiểm tra logic local; không truyền credential provider, không bật OAuth, và không thay đổi hành vi runtime.

### Files thay đổi trong increment

- `frontend/package.json`
- `Dockerfile`
- `.github/workflows/ci.yml`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd run test:oauth` → **2 PASS**, 0 failure/cancel/skip.
- `npm.cmd run lint` → PASS.
- `docker build --tag selfforge:local-preflight-v53-gated .` → PASS; tạo image `sha256:dbe88a90687b…`. Build này đã chạy cổng `test:oauth` trong Docker trước khi tạo runtime image.
- GitHub Actions chưa được trigger từ workspace này; thay đổi workflow là cấu hình đã kiểm tra bằng local build, không phải kết quả CI remote.

### Rào cản và bước tiếp theo

- Bằng chứng deploy/staging vẫn còn thiếu: cần push/review rõ ràng rồi trigger CI remote, deploy staging và thực hiện smoke từ URL công khai. Không thực hiện push/deploy khi chưa có yêu cầu hiện tại.
- Provider OAuth thực, SMTP, payment và device/browser E2E vẫn cần credentials/cấu hình ngoài Git trước khi có thể xác minh tích hợp end-to-end.

## Phiên 2026-11-06 — chặn sớm mật khẩu xác nhận không khớp

- Nghiệm thu form đăng ký trên runtime disposable đã phát hiện nút đăng ký vẫn bật khi hai mật khẩu khác nhau. Backend vốn từ chối trường hợp này khi submit, nhưng trải nghiệm và tín hiệu accessibility ở frontend chưa đủ rõ.
- Thêm predicate dùng chung cho xác nhận mật khẩu, áp dụng cho **đăng ký**, **quên mật khẩu** và **đổi mật khẩu**. Khi người dùng đã nhập một confirmation khác mật khẩu mới, input được đánh dấu `aria-invalid`, có thông báo trạng thái gắn bằng `aria-describedby`, và nút gửi bị disable. Khi hai mật khẩu khớp lại, cảnh báo bị bỏ và form có thể tiếp tục.
- Kiểm tra submit cũ vẫn giữ nguyên như defense-in-depth; backend không bị nới lỏng. Test mới có cổng riêng và chạy trong Docker release/GitHub CI cùng các cổng OAuth đã thêm.

### Files thay đổi trong increment

- `frontend/src/utils/passwordConfirmation.js`, `frontend/src/utils/passwordConfirmation.test.js`
- `frontend/src/pages/LoginPage.jsx`, `frontend/src/components/PasswordResetForm.jsx`, `frontend/src/pages/ProfilePage.jsx`, `frontend/src/index.css`
- `frontend/package.json`, `Dockerfile`, `.github/workflows/ci.yml`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd run test:passwords` → **1 PASS**, 0 failure/cancel/skip.
- `npm.cmd test` → **505 PASS**, 0 failure/cancel/skip; `npm.cmd run lint` và `npm.cmd run build` → PASS.
- `docker build --tag selfforge:local-preflight-v53-password-gated .` → PASS, image `sha256:2c86244330be…`; Docker build đã chạy lint, full frontend suite, cổng OAuth/mật khẩu, build frontend và backend verification.
- Browser acceptance trên local PostgreSQL/runtime disposable: form đăng ký giữ nút disabled và hiện “The passwords do not match.” sau khi đồng ý điều khoản với confirmation khác; sau khi nhập confirmation khớp, thông báo biến mất và nút có thể dùng. Không submit form, không tạo account và không dùng dữ liệu người dùng.
- Hai container preview cùng network disposable đã được xóa sau kiểm tra. Không có thay đổi tới database/deploy thật.

### Rào cản và bước tiếp theo

- GitHub Actions chưa được trigger remote; thay đổi workflow chỉ được chứng minh qua Docker local. Staging/public deploy vẫn chưa được xác minh.
- OAuth provider, SMTP OTP thật, payment merchant/webhook, browser/device native E2E, backup/restore managed database và quyền deploy vẫn là phụ thuộc ngoài Git. Không bật hoặc tuyên bố các tích hợp này hoàn tất khi chưa có credentials và môi trường tách biệt.

## Phiên 2026-11-06 — release gate cho dependency runtime frontend

- Audit production-only của frontend hiện báo **0 vulnerabilities** trên 38 production dependencies. Thêm `audit:runtime` vào Docker release build và GitHub CI; cổng fail từ mức moderate trở lên đối với dependency runtime.
- Audit toàn bộ vẫn báo 4 cảnh báo moderate của dependency **dev-only** `@capacitor/assets → @trapezedev/project → xcode → uuid`. Đây là tool tạo native asset, không có trong dependency runtime/browser bundle. Npm chỉ đề xuất downgrade major `@capacitor/assets` về `1.0.0`, không phải remediation an toàn cho stack Capacitor 8 đang dùng; không chạy `npm audit fix --force` và không đổi lockfile mù quáng.

### Files thay đổi trong increment

- `frontend/package.json`
- `Dockerfile`
- `.github/workflows/ci.yml`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd run audit:runtime` → **0 vulnerabilities**; `npm.cmd run lint` → PASS.
- `npm.cmd audit --omit=dev --json` → 0 info/low/moderate/high/critical production vulnerabilities.
- `npm.cmd audit --json` → 4 moderate, chỉ chuỗi dev tool đã nêu; không có high/critical.
- `docker build --tag selfforge:local-preflight-v53-runtime-audit-gated .` → PASS, image `sha256:d268714ff912…`; frontend stage đã chạy audit runtime, lint, suites/frontend build và backend `mvn verify` trước runtime image.

### Rào cản và bước tiếp theo

- Cần theo dõi release tương thích mới của `@capacitor/assets`/chuỗi `xcode`; chỉ nâng cấp khi có remediation không downgrade stack, rồi chạy native release checks/build trên Android/iOS. Đây là hygiene toolchain, không phải lỗ hổng runtime đang phát hành.
- Remote CI, staging/public deploy, credentials provider và nghiệm thu browser/native thực vẫn chưa có bằng chứng; không coi local release gate là deploy thành công.

## Phiên 2026-11-06 — production smoke trên release candidate hiện tại

- Chạy smoke đầy đủ trên chính image `selfforge:local-preflight-v53-runtime-audit-gated`, PostgreSQL 16 disposable, giới hạn **512 MiB / 1 CPU**. Không kết nối Render, production/staging database, provider OAuth/email/payment hoặc dữ liệu người dùng.
- Smoke xác minh startup và restart Flyway V1–V53, frontend asset/SPA route, đăng ký, feedback/metrics beta được khóa quyền, profile conflict, habit schedule history, scheduled-rest focus, check-in idempotency/correction/XP, challenge/companion, journal/goal/restart persistence, export riêng tư, account isolation, đổi mật khẩu thu hồi session, login throttle, logout, reminder pause/restore và xóa account.

### Kiểm chứng

- `scripts/smoke-production.ps1 -Image selfforge:local-preflight-v53-runtime-audit-gated -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180` → **PASS**.
- Readiness: **44.18 s** khi khởi động và **42.44 s** sau restart.
- Sau `finally` cleanup, kiểm tra read-only `docker ps -a --filter name=sf-smoke-` → không còn container smoke.
- `git diff --check` → không có whitespace error; chỉ có cảnh báo CRLF chuẩn trên Windows.

### Giới hạn còn lại

- Đây là production-like local evidence, không phải kết quả staging/public. GitHub Actions remote, deploy Render/Fly, managed backup/restore, provider OAuth/SMTP/payment và browser/native device E2E vẫn chưa được thực hiện hoặc xác minh.

## Phiên 2026-11-06 — kiểm tra read-only deployment Render hiện có

- Thử kiểm tra read-only URL public hiện có `https://selfforge-evol.onrender.com/api/health` để phân biệt release đang public với release candidate local. Không gửi credential, không gọi mutation, không deploy hay thay đổi dữ liệu.
- `Invoke-WebRequest` có giới hạn 30 giây không nhận được response; một lần fallback duy nhất bằng `curl --max-time 10` cũng hết hạn với HTTP `000` và 0 byte nhận được.

### Rào cản và bước tiếp theo

- Từ môi trường hiện tại không thể xác minh health của URL Render. Có thể là service sleep, sự cố service/deploy hoặc đường mạng, nhưng không suy đoán nguyên nhân chỉ từ timeout và không retry liên tục.
- Cần kiểm tra Render dashboard/log/health từ tài khoản chủ dự án hoặc thực hiện staging deploy có quan sát. Release candidate cục bộ vẫn **không** được coi là đã public; không có thay đổi source/config production trong increment này.

## Phiên 2026-11-06 — OTP fail-closed không tiêu quota khi delivery tắt

- Sửa thứ tự ở ba endpoint có thể yêu cầu email: password reset, registration OTP và email verification của account. Nếu email delivery chưa cấu hình/đang tắt, controller trả `503` **trước khi** reserve budget trong `EmailRequestLimiter`.
- Service vẫn kiểm tra availability lại ngay trước khi tạo/gửi OTP, nên không có cửa sổ làm yếu fail-closed hoặc rate-limit khi provider đang bật. Thay đổi chỉ ngăn các request vào tính năng bị tắt làm đầy global/per-email/per-client quota rồi trả kết quả không đúng (`429` thay vì `503`).
- Thêm regression cho cả ba controller: delivery không khả dụng phải trả `503` và không được gọi limiter; các regression hạn mức sẵn có vẫn xác nhận quota chung chặn request trước khi lookup/sending mail khi delivery hoạt động.

### Files thay đổi trong increment

- `src/main/java/com/selfforge/discipline/auth/PasswordResetService.java`, `RegistrationVerification.java`
- `src/main/java/com/selfforge/discipline/auth/PasswordResetController.java`, `RegistrationController.java`, `EmailVerificationController.java`
- `src/test/java/com/selfforge/discipline/EmailRequestLimiterTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=EmailRequestLimiterTests,PasswordResetTests,RegistrationTests` → **23 PASS** (6 limiter + 8 reset + 9 registration), 0 failure/error/skip.
- `mvn -B test -Dtest=ProductionSafetyTests,MigrationSchemaTests` → **335 PASS**, 0 failure/error/skip.
- `mvn -B -Ppostgres-tests -Dit.test=PostgresMigrationIT#productionStartupAndRestartPreserveData test-compile failsafe:integration-test failsafe:verify` → PostgreSQL 16/Flyway V53 **1 PASS**, 0 failure/error/skip.
- `docker build --tag selfforge:local-preflight-v53-email-gate .` → PASS, image `sha256:8fbf934df3a9…`.
- `scripts/smoke-production.ps1 -Image selfforge:local-preflight-v53-email-gate -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180` → **PASS**. Readiness: **63.47 s** khi khởi động, **60.44 s** sau restart; không còn `sf-smoke-*` container sau cleanup.

### Rào cản và bước tiếp theo

- Đây vẫn là evidence local/disposable. Email provider thật, OAuth/payment, remote CI, staging/public health và managed backup/restore chưa được xác minh.
- URL Render hiện có không phản hồi từ cả HTTP client và browser service của môi trường này; cần quan sát từ Render dashboard/log hoặc staging có quyền trước khi quyết định deploy release candidate.

## Phiên 2026-11-06 — định danh release an toàn cho health và deploy smoke

- `/api/health`, `/api/health/ready` và `/api/health/live` giờ trả thêm `release`: SHA-256 opaque của **artifact thực được đóng gói**. Giá trị không chứa commit name, URL, environment setting, credential hay dữ liệu tài khoản; status `UP`/`DOWN` và semantics liveness/readiness cũ được giữ nguyên.
- Docker tạo `assets/release.json` sau khi copy fresh Vite bundle và trước Maven package. Digest bao gồm `pom.xml`, backend, migration và frontend bundle; vì vậy thay đổi chỉ ở backend cũng tạo release ID mới, không phụ thuộc riêng frontend update hash. Docker context đã loại trừ `src/main/resources/static`, nên layer này không thể vô tình đóng gói static asset cũ của host.
- Thêm fallback `unknown` cho development/manual artifact không có marker thay vì làm health fail; validation chỉ chấp nhận lowercase SHA-256 64 ký tự. `app-version.json` và `release.json` được `no-cache` để browser/CDN revalidate sau deploy.
- Production smoke bây giờ bắt buộc: release marker có hai digest hợp lệ, frontend digest của marker khớp `app-version.json`, marker được revalidate, và cả ba health endpoint báo đúng cùng release ID.

### Files thay đổi trong increment

- `Dockerfile`, `scripts/smoke-production.ps1`
- `src/main/java/com/selfforge/discipline/common/ReleaseInfo.java`, `HealthController.java`, `SecurityHeadersFilter.java`
- `src/test/java/com/selfforge/discipline/common/ReleaseInfoTests.java`, `src/test/java/com/selfforge/discipline/ProductionSafetyTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=ReleaseInfoTests,ProductionSafetyTests` → **168 PASS**, 0 failure/error/skip.
- `docker build --tag selfforge:local-preflight-v53-release-health .` → **PASS**; backend stage chạy toàn bộ **521 tests** (0 failure/error/skip), image `sha256:626ab83a7e40…`.
- Đọc artifact bằng container disposable xác nhận marker thực: release `fee0f90194ebd411b1050de9f56db75ce1bee00ef6de24fc6d8e9e8f6922a126`, frontend `67dbfd744a33a059db258cbe5dc54234657b20996f5ae52feff9f248fff98310`.
- `scripts/smoke-production.ps1 -Image selfforge:local-preflight-v53-release-health -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180` → **PASS**. Readiness **56.13 s** khi startup, **56.01 s** sau restart; smoke đã xác minh marker/health trước toàn bộ luồng production-like còn lại.
- `docker ps -a --filter name=sf-smoke-` → không còn container smoke.

### Rào cản và bước tiếp theo

- Local image có thể được nhận diện chính xác sau deploy, nhưng GitHub Actions remote, staging/public deploy và managed backup/restore vẫn chưa có bằng chứng. URL Render hiện tại trước đó timeout từ môi trường này; cần xem Render dashboard/log hoặc deploy staging có quyền để đối chiếu public health `release` với artifact được duyệt.
- OAuth provider, SMTP OTP thật, payment merchant/webhook và browser/native device E2E vẫn là dependency ngoài Git; không bật hay tuyên bố các tích hợp đó hoàn tất khi chưa có credentials và môi trường tách biệt.

## Phiên 2026-11-06 — regression cho đổi timezone trong lịch habit/check-in

- Bổ sung regression ở luồng dịch vụ thật (tạo habit → đổi timezone profile → sửa habit → dashboard/check-in), không chỉ fixture SQL. Case là người dùng chuyển từ `Pacific/Kiritimati` sang `America/Adak` tại cùng instant: state mới có `calendarDate` sớm hơn state tạo trước đó.
- Xác nhận timeline vẫn lấy state được ghi sau (ID làm tie-break khi `recordedAt` bằng nhau), nên schedule 5 ngày mới tiếp tục có hiệu lực vào ngày lịch sau đó và snapshot check-in ngày mới dùng đúng target/weekday mới. Không suy diễn hoặc thay đổi check-in lịch sử.
- Đây là regression coverage cho nghiệp vụ lõi hiện hữu; không đổi API, migration, dữ liệu người dùng hay policy timezone đã kiểm chứng.

### Files thay đổi trong increment

- `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=StreakConsumerTests,StreakTests,ReleaseInfoTests` → **45 PASS** (27 + 17 + 1), 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Không có blocker kỹ thuật cho regression này. Browser/mobile E2E thực, provider credentials, staging/public deploy và managed backup/restore vẫn là các dependency ngoài Git chưa được xác minh.
- Phần lõi lịch/check-in tiếp theo nên ưu tiên nghiệm thu UI mobile/browser của onboarding → tạo habit → check-in → xem tiến độ → quay lại, thay vì mở thêm module hoặc tự bật provider.

## Phiên 2026-11-06 — Dashboard lịch sử đồng bộ target và weekday schedule

- Sửa `DashboardService`: khi endpoint được gọi với ngày quá khứ, `HabitProgress.targetPerWeek` và `scheduledDays` cùng lấy từ một `HabitStateHistory` date-effective. Trước đó lịch ngày cũ có thể trả weekday schedule lịch sử nhưng target hiện tại, tạo thông tin mâu thuẫn trên UI/API.
- Streak, check-in snapshot, XP/phạt và response cho ngày hiện tại không đổi. Khi chưa có state history, vẫn dùng fallback current schedule/target như trước, không suy diễn lịch sử legacy.
- Bổ sung assertion cho lịch sử rest-day, profile timezone backtrack và timestamp bằng nhau để khóa cả target lẫn schedule được trình bày nhất quán.

### Files thay đổi trong increment

- `src/main/java/com/selfforge/discipline/dashboard/DashboardService.java`
- `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=StreakConsumerTests,StreakTests,ProductionSafetyTests` → **211 PASS** (27 + 17 + 167), 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Không có migration/config/provider mới trong increment. Cần browser/mobile E2E cho hành trình người dùng và staging/public verification để khép phạm vi beta; các phụ thuộc OAuth/SMTP/payment và managed backup/restore vẫn chưa có credentials/quyền cần thiết.

## Phiên 2026-11-06 — tỷ lệ tuần giữ đúng target lịch sử

- Hoàn thiện cùng contract Dashboard lịch sử: `weekCompletionRate` giờ dùng target của `HabitStateHistory` tại ngày đang xem, thay vì tổng target hiện tại của habit. Vì vậy, một tuần đã hoàn thành đủ 5 lượt theo lịch cũ vẫn hiển thị **100%** sau khi người dùng nâng target hiện tại lên 7.
- Ngày Dashboard hiện tại không đổi vì state tại ngày hiện tại khớp habit đang chỉnh sửa. Check-in snapshot, streak, XP/phạt và dữ liệu legacy không bị sửa hay suy diễn lại.
- Regression bổ sung 5 completion thứ Hai–thứ Sáu của tuần lịch sử, chốt cả `targetPerWeek`, weekday schedule và rate 1.0. Đây là test dữ liệu thực, không phải sửa UI bằng hard-code.

### Files thay đổi trong increment

- `src/main/java/com/selfforge/discipline/dashboard/DashboardService.java`
- `src/test/java/com/selfforge/discipline/StreakConsumerTests.java`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `mvn -B test -Dtest=StreakConsumerTests,StreakTests,ProductionSafetyTests` → **211 PASS** (27 + 17 + 167), 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Không có blocker kỹ thuật trong increment. Nghiệm thu browser/mobile chuẩn vẫn bị giới hạn bởi môi trường browser hiện tại; không retry in-app browser đã biết không hỗ trợ mutation/storage chuẩn.
- Tiếp tục phạm vi có thể kiểm chứng: định tuyến các release gate và API đã sửa qua remote CI/staging khi có quyền; OAuth/SMTP/payment và managed backup/restore chờ credentials/môi trường tách biệt.

## Phiên 2026-11-06 — harden công cụ đọc funnel beta hiện hữu

- Rà soát phát hiện `scripts/read-beta-metrics.ps1` đã là công cụ aggregate-only hiện hữu; loại bỏ bản `get-beta-metrics.ps1` trùng lặp vừa tạo để không tạo hai contract/key convention cho cùng một thao tác vận hành.
- Harden script gốc với `Set-StrictMode`, xác thực response thuộc đúng khoảng ngày đã yêu cầu và xác thực tất cả aggregate count là số nguyên không âm. Allowlist hiện hữu vẫn là lớp chặn account ID, email, journal hay field không mong đợi đi vào báo cáo operator.
- Script tiếp tục yêu cầu `BETA_METRICS_KEY` **chỉ từ environment** (không nhận qua command line), dùng HTTPS cho URL deploy và chỉ cho HTTP localhost phục vụ smoke/contract test. Đây chỉ là công cụ đọc, không thay đổi dữ liệu hay rollout.

### Files thay đổi trong increment

- `scripts/read-beta-metrics.ps1`
- Xóa `scripts/get-beta-metrics.ps1` trùng lặp
- `TASK_PROGRESS.md`

### Kiểm chứng

- PowerShell AST parse của `scripts/read-beta-metrics.ps1` → **PASS**.
- Chạy script khi không có key → dừng trước network với thông báo yêu cầu `BETA_METRICS_KEY`, như thiết kế.
- Local HTTP listener disposable trả response aggregate hợp lệ → script xác thực contract và trả đúng report; listener/job đã được đóng sau test.
- Local HTTP listener disposable trả aggregate âm → script từ chối response trước khi in report.
- `mvn -B test -Dtest=BetaMetricsServiceTests,BetaFeedbackOperatorTests,ProductionSafetyTests` → **171 PASS** (3 + 1 + 167), 0 failure/error/skip.

### Rào cản và bước tiếp theo

- Chưa thể truy vấn production metrics vì chưa có public environment/operator key được cấp; không thử đoán key hay gọi lại endpoint Render đang timeout từ môi trường này.
- Bước release tiếp theo vẫn là chạy remote CI/staging, kiểm thử onboarding trên browser/device thật, rồi mới mở lời mời beta theo đợt. SMTP/OAuth/payment thật và backup/restore managed tiếp tục chờ tài khoản provider/quyền triển khai.

## Phiên 2026-11-06 — xác minh artifact sau staging/deploy

- Bổ sung `scripts/verify-deployment-release.ps1`, một cổng **read-only** dành cho staging/public URL. Script xác minh `release.json`, `app-version.json`, và cả `/api/health`, `/ready`, `/live` cùng trỏ tới một release opaque SHA-256; marker release/frontend bắt buộc `no-cache` để tránh xác nhận nhầm bundle cache cũ.
- Có thể truyền `-ExpectedRelease` từ release candidate đã duyệt để từ chối đúng trường hợp môi trường online đang chạy một artifact khác. Script không dùng credential, không gọi mutation và không truy vấn dữ liệu người dùng.
- URL deploy bắt buộc HTTPS. HTTP chỉ được chấp nhận khi người vận hành nêu rõ `-AllowInsecureLocalhost`, phục vụ contract test disposable; không phải lối tắt cho staging/production.

### Files thay đổi trong increment

- `scripts/verify-deployment-release.ps1`
- `TASK_PROGRESS.md`

### Kiểm chứng

- PowerShell AST parse → **PASS**.
- Local HTTP listener disposable mô phỏng đủ marker và ba health endpoint → script xác minh đúng release/frontend/3 health endpoint, **PASS**; listener/job được đóng sau test.
- Local HTTP không có switch explicit → bị từ chối bởi HTTPS guard, **PASS**.
- Local marker có release khác `-ExpectedRelease` → script từ chối trước khi kiểm tra health endpoint, **PASS**.
- `git diff --check` → không có whitespace error; chỉ có cảnh báo CRLF chuẩn trên Windows worktree.

### Rào cản và bước tiếp theo

- Không chạy script vào Render URL vì endpoint này đã timeout từ môi trường hiện tại và không có staging/public deployment mới để đối chiếu. Không retry/poll khi chưa có tín hiệu trạng thái thay đổi.
- Khi có deploy được duyệt, người vận hành chạy script với URL và release digest của image đã kiểm thử; sau đó mới thực hiện smoke journey browser/device thật. SMTP/OAuth/payment, managed backup/restore và quyền deploy vẫn là dependency ngoài repository.

## Phiên 2026-11-06 — làm gọn màn Premium khi chưa mở bán

- Sửa spacing của card “Premium chưa mở bán”. Global CSS reset margin về 0 khiến tiêu đề, nội dung, lỗi và nút tải lại dính sát nhau; card nay có grid gap rõ ràng, độ rộng đọc hợp lý, nút căn trái và error state có nền/border riêng.
- Bỏ ba nút disabled “Sắp ra mắt” lặp lại ở từng gói. Chúng được thay bằng status “Chưa mở bán”, giảm mật độ control không thao tác được và tránh tạo ấn tượng có checkout khi payment chưa được nghiệm thu.
- Bổ sung bản dịch English cho status mới. Không đổi giá, quyền Premium, API payment, feature flag hay bất kỳ luồng thanh toán nào.

### Files thay đổi trong increment

- `frontend/src/pages/PremiumPage.jsx`
- `frontend/src/index.css`
- `frontend/src/utils/premiumEnglish.js`, `frontend/src/utils/language.test.js`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd test` → **505 PASS**, 0 failure/cancel/skip.
- `npm.cmd run lint` → **PASS**.
- `npm.cmd run build` → **PASS** (Vite 8.3.5).

### Rào cản và bước tiếp theo

- Premium vẫn chưa mở bán: provider sandbox/merchant, QR/checkout UX, webhook staging, đối soát và policy refund chưa được cấu hình/nghiệm thu. Không bật payment hoặc hứa hẹn kích hoạt tự động từ chỉnh sửa UI này.
- Tiếp tục ưu tiên beta core: browser/device E2E và staging/public verification khi có môi trường/quyền phù hợp; provider thực và backup/restore managed vẫn là dependency ngoài repository.

## Phiên 2026-11-06 — chọn ngôn ngữ trước đăng ký và giữ preference account

- Landing page nay có selector VI/EN gọn, nên người dùng nước ngoài có thể đọc landing và vào đăng ký/đăng nhập bằng ngôn ngữ họ chọn thay vì chỉ phụ thuộc vào locale trình duyệt.
- Sửa gap đồng bộ preference: một lựa chọn **chủ động** khi chưa đăng nhập sẽ được gửi vào account sau khi đăng ký/đăng nhập chỉ khi account chưa có language preference. Preference đã lưu trên server luôn thắng; landing công khai không thể ghi đè lựa chọn của account từ thiết bị khác.
- Chỉ preference `vi`/`en` hợp lệ được đưa vào hàng đợi sync; offline/failure vẫn dùng ngôn ngữ local và retry theo cơ chế `online` hiện hữu. Không đổi schema/API vì account language V44 và `PATCH /profile` đã có sẵn.

### Files thay đổi trong increment

- `frontend/src/pages/LandingPage.jsx`, `frontend/src/index.css`
- `frontend/src/context/LanguageProvider.jsx`
- `frontend/src/utils/language.js`, `frontend/src/utils/language.test.js`
- `TASK_PROGRESS.md`

### Kiểm chứng

- Regression unit cho lựa chọn public: account chưa có preference nhận `vi`/`en` hợp lệ; account có preference luôn trả `null` cho pending sync → **PASS**.
- `npm.cmd test` → **506 PASS**, 0 failure/cancel/skip.
- `npm.cmd run lint` → **PASS**.
- `npm.cmd run build` → **PASS** (Vite 8.3.5).

### Rào cản và bước tiếp theo

- Cần browser/device E2E chuẩn để quan sát đầy đủ landing → chọn EN → đăng ký → reload/thiết bị thứ hai; môi trường browser hiện tại không phù hợp và không được dùng thay cho nghiệm thu đó.
- SMTP/OAuth/payment thật, staging/public deployment và managed backup/restore vẫn là dependency ngoài repository; không có provider nào được bật trong increment này.

## Phiên 2026-11-06 — ngôn ngữ nhất quán ở trang pháp lý công khai

- Thêm language selector gọn vào header của `/privacy` và `/terms`. Người mở link trực tiếp nay có thể chọn VI/EN ngay tại trang, thay vì phải quay qua landing hay login.
- Tái sử dụng `LanguageSelector` với variant compact; không sao chép logic preference/sync. Header giữ các link legal hiện có, responsive wrap và label select vẫn hiển thị rõ cho accessibility.
- Nội dung pháp lý vốn đã có đủ hai bản ngôn ngữ theo `LanguageProvider`; increment này chỉ mở đường cho người chưa đăng nhập đổi preference ở chính điểm cần đọc điều khoản.

### Files thay đổi trong increment

- `frontend/src/components/LanguageSelector.jsx`
- `frontend/src/pages/PublicInformationPage.jsx`
- `frontend/src/index.css`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `npm.cmd test` → **506 PASS**, 0 failure/cancel/skip.
- `npm.cmd run lint` → **PASS**.
- `npm.cmd run build` → **PASS** (Vite 8.3.5).

### Rào cản và bước tiếp theo

- Nghiệm thu tương tác trên browser/mobile chuẩn vẫn cần môi trường phù hợp; không dùng in-app browser thiếu storage/mutation chuẩn để thay thế E2E.
- Provider email/OAuth/payment, staging/public verification và managed backup/restore tiếp tục cần credentials/quyền ngoài repository.

## Phiên 2026-11-06 — release candidate local sau cập nhật UI công khai

- Không sửa thêm source trong increment này. Đã build lại toàn bộ worktree hiện tại thành image `selfforge:local-preflight-public-ui`, để kiểm chứng các thay đổi UI công khai cùng các thay đổi backend/migration đang có mà không ghi đè chúng.
- Image có manifest digest `sha256:dc4fe48df10acd88344451b8fb1a9ffe942caae1748093844c7d47901b891a96` (tạo lúc `2026-11-06T14:51:39Z`). Docker cleanup không còn container smoke `sf-smoke-*`.

### Files thay đổi trong increment

- `TASK_PROGRESS.md`

### Kiểm chứng

- Docker build `selfforge:local-preflight-public-ui` → **PASS**: frontend runtime audit/lint/test/build gates hoàn tất; Maven `verify` → **522 tests PASS**, 0 failure/error/skip.
- Flyway migration validation/apply trong build → **PASS** đến schema `V53`.
- `scripts/smoke-production.ps1 -Image selfforge:local-preflight-public-ui -MemoryMb 512 -CpuLimit 1 -StartupTimeoutSeconds 180` → **PASS**. Container ready sau 52.03s, restart ready sau 37.54s; kiểm tra assets, registration, feedback/metrics beta, habit/challenge/companion, journal/goal/restart, export, isolation, đổi mật khẩu/session revocation, login throttling, reminder và xóa account đều qua.
- `git diff --check` → không có whitespace error; chỉ còn cảnh báo CRLF chuẩn trên Windows worktree.

### Rào cản và bước tiếp theo

- Đây là release candidate **local**, chưa phải deployment công khai. Không có quyền/xác thực staging hoặc deploy trong phiên này; endpoint Render trước đó timeout từ môi trường hiện tại nên không retry/poll khi chưa có tín hiệu mới.
- Trước khi phát hành beta thật: deploy image/commit đã chốt vào staging, chạy `scripts/verify-deployment-release.ps1` với release digest thực tế, sau đó làm browser/device E2E. SMTP/OAuth/payment thật và managed backup/restore vẫn cần credentials/quyền của người vận hành.

## Phiên 2026-11-06 — audit handoff phát hành beta

- Đối chiếu Git chỉ-đọc: local `main` đang ở `5d99bf4`, trong khi `origin/main` vẫn ở `d24d80e`. Release candidate Docker đã kiểm thử được build từ các thay đổi **chưa commit** trong worktree hiện tại, gồm cả nhiều file có nguồn gốc từ các lượt trước.
- Không stage, commit, push hoặc deploy: không thể suy ra từ build PASS rằng toàn bộ thay đổi lẫn trong worktree đã được chủ dự án duyệt để công bố.
- Pipeline tracked của GitHub là deploy thủ công Fly.io và cần `FLY_API_TOKEN`; Render dùng Blueprint riêng và vẫn yêu cầu ba biến database thiết lập ngoài Git. Cả hai chưa có bằng chứng run remote/staging trong phiên này.

### Files thay đổi trong increment

- `TASK_PROGRESS.md`

### Kiểm chứng

- `git remote -v`, `git branch --show-current`, `git log -5 --oneline --decorate` và đọc `.github/workflows/deploy.yml`/`render.yaml` → xác nhận remote, commit divergence và các dependency deploy nêu trên.
- Không gọi endpoint Render, không trigger GitHub Actions, không ghi remote và không thay đổi secret/cloud resource.

### Rào cản và bước tiếp theo

- Cần chủ dự án xác nhận phạm vi commit/push của worktree đã kiểm thử, sau đó mới có thể chạy CI remote/deploy staging. Vì worktree có nhiều thay đổi chưa commit, không an toàn để tự chọn và công bố chúng.
- Sau deploy staging thành công: chạy `scripts/verify-deployment-release.ps1` với release digest của artifact deployed rồi nghiệm thu browser/device E2E. Provider SMTP/OAuth/payment và backup/restore managed tiếp tục là dependency riêng.

## Phiên 2026-11-07 — sửa CI thiếu dữ liệu Help đã bị ignore

- Push release candidate `b754f74` đã trigger hai workflow GitHub. Cả hai dừng ở frontend validation; không có deploy được chạy.
- Đọc log CI với GitHub session hiện có xác định chính xác `ERR_MODULE_NOT_FOUND` cho `frontend/src/data/helpTopics.js` trong `src/utils/help.test.js`. File có tồn tại cục bộ nên test local xanh, nhưng rule `.gitignore` `data/` đã bỏ qua mọi thư mục con tên `data`, khiến file không có trong commit.
- Thu hẹp rule thành `/data/` để chỉ bỏ qua dữ liệu runtime ở root repository, và đưa `frontend/src/data/helpTopics.js` (dữ liệu Help tĩnh mà `HelpPage` và regression import) vào source control. Không đổi nội dung Help hay hành vi ứng dụng.

### Files thay đổi trong increment

- `.gitignore`
- `frontend/src/data/helpTopics.js`
- `TASK_PROGRESS.md`

### Kiểm chứng

- `node --test src/utils/help.test.js` → **3 PASS**, gồm Help search và allowlist diagnostics.
- Đợt `npm.cmd ci --ignore-scripts` + runtime audit, lint, **506 frontend tests**, OAuth/password tests và production build trước đó trong worktree cùng file này đều PASS. Fix chỉ làm source tree remote khớp local; CI remote cần chạy lại sau push.
- `git diff --cached --check` → PASS trước khi commit; chỉ có warning CRLF thông thường khi Git stage trên Windows.

### Rào cản và bước tiếp theo

- Cần push commit này để GitHub Actions chạy lại với `helpTopics.js` hiện diện. Chỉ khi CI remote xanh mới tiếp tục staging/deploy verification.
- Staging/public deploy, browser/device E2E, SMTP/OAuth/payment credentials và backup/restore managed vẫn chưa được xác minh.

## Phiên 2026-11-07 — chuẩn hóa header smoke cho PowerShell Linux CI

- Sau fix Help, cả hai workflow remote đã qua frontend. Workflow `Verify SelfForge` qua toàn bộ backend, PostgreSQL/Flyway và native bundle. Workflow `Verify` qua PostgreSQL/Flyway và Docker production image, nhưng smoke dừng trước kiểm tra chức năng do assertion đọc `Cache-Control` nhận `System.Object[]` trên PowerShell/Linux.
- Thêm `Get-ResponseHeader` để gộp mọi giá trị header thành một string trước các regex assertion trong `smoke-production.ps1`. Sửa tất cả check `Cache-Control`/`Content-Type`, không nới điều kiện smoke hay bỏ qua marker/asset/PWA validation.
- Áp dụng cùng chuẩn hóa vào `verify-deployment-release.ps1`, để cổng staging/public không gặp cùng lỗi khi deploy response có lặp header.

### Files thay đổi trong increment

- `scripts/smoke-production.ps1`
- `scripts/verify-deployment-release.ps1`
- `TASK_PROGRESS.md`

### Kiểm chứng

- PowerShell AST parse cho cả hai script → **PASS**.
- Thử chạy smoke local sau sửa dừng trước container vì Docker Desktop không còn pipe `dockerDesktopLinuxEngine`; không retry khi daemon không khả dụng và không diễn giải đây là smoke PASS/FAIL của application.
- Remote CI đã cung cấp bằng chứng trước fix rằng migration V1–V53 và image build đều PASS; commit kế tiếp phải chạy lại smoke Linux để xác minh assertion đã chuẩn hóa.

### Rào cản và bước tiếp theo

- Push fix script để CI remote kiểm chứng full image/smoke. Không deploy staging/public khi smoke chưa xanh.
- Docker local cần được chủ dự án mở lại nếu muốn tái tạo smoke tại máy; credentials/provider và browser/device E2E vẫn là dependency ngoài repository.

## Phiên 2026-11-07 — remote CI release gate đã xác minh

- Commit sửa header `3b23bfe` đã được push sau fix dữ liệu Help `470bf88`. GitHub Actions chạy lại trên Linux runner, thay vì suy diễn từ Docker/PowerShell Windows local.
- Workflow `Verify SelfForge` đã PASS frontend validation, backend với web bundle mới, PostgreSQL/Flyway integration và native web bundle (`run 42320867516`).
- Workflow `Verify` đã PASS runtime audit, lint, frontend tests, OAuth/password tests, build, PostgreSQL/Flyway verify, Docker production image, và smoke production/restart persistence (`run 42320867502`). Smoke header normalization được thực thi thành công trong gate cuối.
- Không trigger workflow deploy, Fly.io, Render, migration staging/production, hay bất kỳ provider thật nào trong quá trình này.

### Files thay đổi trong increment

- `TASK_PROGRESS.md`

### Kiểm chứng

- GitHub Actions `Verify SelfForge` → **PASS**: <https://github.com/manhtw0ne/self_forge/actions/runs/42320867516>.
- GitHub Actions `Verify` → **PASS**: <https://github.com/manhtw0ne/self_forge/actions/runs/42320867502>.
- `git status` trước cập nhật tài liệu không có thay đổi source chưa commit sau `3b23bfe`; commit tài liệu này không làm đổi artifact ứng dụng đã được CI kiểm chứng.

### Rào cản và bước tiếp theo

- Release candidate đã được xác minh cả local và remote CI, nhưng **chưa deploy công khai**. Staging/public deployment còn cần lựa chọn đích (Render hoặc Fly.io), database managed/JDBC secrets, quyền trigger deploy, rồi mới chạy `scripts/verify-deployment-release.ps1` với URL artifact thật.
- Browser/device E2E, SMTP/OAuth/payment credentials và backup/restore managed vẫn chưa được nghiệm thu; payment/OAuth tiếp tục tắt mặc định.
