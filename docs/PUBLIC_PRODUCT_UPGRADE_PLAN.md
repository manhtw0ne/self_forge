# SelfForge — Kế hoạch sửa lỗi và nâng cấp thành sản phẩm public

**Mốc kiểm chứng hiện tại (07/10/2026, batch 41):** 147 tests backend và 56 integration tests trên PostgreSQL 16.15 đạt, Flyway V1–V8. Frontend: 38 tests đạt ở batch 40. Phase 1 vẫn đang triển khai; chưa nghiệm thu public toàn bộ, chưa deploy các thay đổi này. Các ghi chú bên dưới là lịch sử từng đợt.


Ngày lập: 22/09/2026; cập nhật 24/09/2026. Trạng thái: đang triển khai Phase 1/A1. Đã sửa request lặp, điều chỉnh XP check-in mới và kiểm tra thời gian/phiên Pomodoro chồng nhau. Xem [đợt 1](PHASE_1_BATCH_1_RESULTS.md), [đợt 2](PHASE_1_BATCH_2_RESULTS.md), [đợt 3](PHASE_1_BATCH_3_RESULTS.md); chưa hoàn tất A1.

Tiến độ mới nhất: [đợt 4 — múi giờ](PHASE_1_BATCH_4_RESULTS.md), [đợt 5 — quota bảo vệ streak](PHASE_1_BATCH_5_RESULTS.md). Đợt mới nhất: [đợt 6 — streak dài và ngày check-in](PHASE_1_BATCH_6_RESULTS.md): thống nhất streak dashboard/huy hiệu, freeze, căn cứ phạt và chặn check-in tương lai. Đã thực hiện [đợt 7 — quota khi thao tác đồng thời](PHASE_1_BATCH_7_RESULTS.md): khóa tạo/bật lại habit, quota goal và cập nhật tiến độ đồng thời. Đã thực hiện [đợt 8 — vòng đời mục tiêu](PHASE_1_BATCH_8_RESULTS.md): validation, chống tràn tiến độ và nhất quán trạng thái khi đổi chỉ tiêu. Đã thực hiện [đợt 9 — chống cộng tiến độ lặp](PHASE_1_BATCH_9_RESULTS.md): requestId, migration V3 và retry từ giao diện. Đã thực hiện [đợt 10 — khôi phục tiến độ chờ](PHASE_1_BATCH_10_RESULTS.md): lưu thao tác theo tài khoản qua reload và giao diện thử lại; 8 test frontend qua. Backend giữ kết quả 94 test ở đợt 9; A1/A2 còn mở, đặc biệt lịch ngày nghỉ và chính sách check-in bù.

Tiến độ kiểm chứng mới nhất: [đợt 11 — PostgreSQL và CI](PHASE_1_BATCH_11_RESULTS.md): 94 test backend thường, 38 integration test trên PostgreSQL 16.15 và 8 test frontend đều qua. Đã xác nhận migration V1–V3 và các test đồng thời hiện có trên PostgreSQL; Đã bổ sung [đợt 12 — cổng kiểm thử trước deploy](PHASE_1_BATCH_12_RESULTS.md), actionlint local qua; chưa chạy trên GitHub. Còn E2E, tải và backup/restore.

Cập nhật 26/09/2026: [đợt 13 — xác nhận mật khẩu mới](PHASE_1_BATCH_13_RESULTS.md), 96 test backend qua. Tiếp tục chức năng; theo yêu cầu người dùng, deploy để sau vì đã có bản online.

Cập nhật tiếp 26/09/2026: [đợt 14 — OTP quên mật khẩu](PHASE_1_BATCH_14_RESULTS.md): API, giao diện, SMTP và V4; 104 test qua. Chờ cấu hình/kiểm thử email thật theo [hướng dẫn](PASSWORD_RESET_EMAIL.md).

Cập nhật 26/09/2026: [đợt 15 — OTP đăng ký](PHASE_1_BATCH_15_RESULTS.md): API/UI và V5; 111 test qua. Xem [cấu hình](REGISTRATION_EMAIL.md); chưa nghiệm thu SMTP thật.

Cập nhật 26/09/2026: [đợt 16 — Việt/Anh cho menu và xác thực](PHASE_1_BATCH_16_RESULTS.md), 12 test frontend qua. Đa ngôn ngữ mới hoàn thành phạm vi đầu tiên, chưa phủ toàn bộ ứng dụng.

Cập nhật 26/09/2026: [đợt 17 — Việt/Anh cho thói quen và mục tiêu](PHASE_1_BATCH_17_RESULTS.md), 14 test frontend qua. Giữ dữ liệu tự nhập và chỉ dịch danh mục hệ thống.

## 1. Mục tiêu và phạm vi

Đưa SelfForge từ MVP có nhiều chức năng thành sản phẩm theo dõi thói quen mà người dùng có thể sử dụng hằng ngày, dữ liệu được bảo vệ và có người vận hành khi xảy ra lỗi. Mốc đầu là khoảng 100 người dùng thật, tăng dần từ nhóm thử nghiệm nhỏ.

“Public hoàn chỉnh” trong kế hoạch này là hoàn chỉnh trong phạm vi đã công bố, không phải có mọi tính năng có thể nghĩ ra. Chức năng chưa hoàn thiện phải được hoàn thiện hoặc ẩn khỏi bản phát hành; không để người dùng thấy nút có vẻ hoạt động nhưng không mang lại kết quả.

- Giữ React/JavaScript ở frontend, Java 21/Spring Boot ở backend, PostgreSQL ở production.
- Ưu tiên web mobile và PWA trước; dùng Capacitor cho Android/iOS ở giai đoạn sau.
- Bản public miễn phí không phụ thuộc vào việc hoàn thành thanh toán Premium hay được duyệt lên store.
- Chưa có ngân sách: dùng hạ tầng miễn phí cho staging/beta trong hạn mức, đo thực tế trước khi mở rộng. Không cam kết chất lượng production nếu hạ tầng chưa đáp ứng.
- Giai đoạn sản phẩm 1 tập trung hoàn thiện lõi public; chưa bổ sung mạng xã hội, AI hoặc microservices. Giai đoạn sản phẩm 2 bổ sung AI theo mục 16 và [kế hoạch AI chi tiết](AI_PHASE_2_PLAN.md).
- Yêu cầu sản phẩm đã xác nhận: đăng nhập Google/Facebook, email OTP thật cho đăng ký và thay đổi/khôi phục mật khẩu, nhập lại mật khẩu xác nhận, chuyển khoản tự động mở Premium và đa ngôn ngữ. Chi tiết triển khai và nghiệm thu ở mục 15; các yêu cầu này thay thế các mô tả chung trước đó nếu có khác biệt.
- 100 tài khoản hoặc 100 người hoạt động trong ngày không đồng nghĩa 100 người thao tác đồng thời.
- Giai đoạn sản phẩm 3 bổ sung bạn đồng hành phát triển bằng XP từ nhiệm vụ thực tế; xem mục 17 và [kế hoạch Phase 3](COMPANION_PHASE_3_PLAN.md). Đây không phải hệ thống game hoặc nhiệm vụ chăm thú riêng.

## 2. Cơ sở đánh giá hiện tại

Đã đọc code, cấu hình và báo cáo trong repository. Chưa chạy lại bộ test, kiểm thử tải hoặc thiết bị thật khi viết kế hoạch này.

| Hạng mục | Hiện trạng và cách xử lý |
|---|---|
| Lõi sản phẩm | Có đăng nhập, habit, check-in, journal, challenge, dashboard, stats, goals, mood, Pomodoro, rewards và weekly review; cần nghiệm thu từng luồng |
| Các sửa lỗi trước | Đã có sửa persistence, logout, validation, chặn tự cấp Premium và một số transaction; giữ lại và bổ sung hồi quy khi thay đổi |
| PostgreSQL | Đã có Flyway V1, Hibernate validate và test migration; không viết lại V1 đã phát hành |
| Kiểm thử | Báo cáo 20/09 ghi nhận 19 test thường và 10 test PostgreSQL qua; đây là kết quả lịch sử, không chứng minh bản public hiện tại |
| Check-in/XP | `CheckInService.upsert` gọi cộng XP khi request là COMPLETED, kể cả bản ghi đã hoàn thành; FAILED cũng có thể gọi phạt lại. Cần test tái hiện và sửa ngay |
| Múi giờ | Nhiều service dùng `LocalDate.now()`/`LocalTime.now()` dù hồ sơ có timezone |
| Nhắc nhở | Có CRUD và API lấy lịch đến hạn; chưa thấy cơ chế giao thông báo tới thiết bị |
| Tài khoản | Chưa thấy luồng quên mật khẩu, xác minh email, xóa tài khoản đầy đủ |
| Mobile | Chưa có cấu hình PWA/Capacitor; chưa có bằng chứng E2E trên điện thoại |
| Vận hành | Có Docker, CI và health kiểm tra DB; chưa có bằng chứng staging online, load test, backup/restore và cảnh báo hoạt động |

Tài liệu liên quan: [kết quả trước đây](UPGRADE_RESULTS.md), [migration](DATABASE_MIGRATIONS.md), [runbook](DEPLOY_RUNBOOK.md), [Render + Neon](DEPLOY_RENDER_NEON.md). Các nhận định lịch sử trong tài liệu cũ không thay thế trạng thái mới ở bảng trên.

## 3. Quy tắc thực hiện và ưu tiên

- P0: sai/mất/lộ dữ liệu, sai quyền hoặc điểm bị cộng/trừ lặp; chặn thử nghiệm với dữ liệu thật khi lỗi còn mở.
- P1: cần hoàn thành trước public trong phạm vi sản phẩm được công bố.
- P2: cải thiện hoặc phát hành sau; nếu chưa làm thì ẩn phần tương ứng và ghi rõ phạm vi hỗ trợ.
- Mỗi hạng mục đi theo thứ tự: xác định hành vi mong muốn → tái hiện lỗi nếu có → sửa → kiểm chứng → cập nhật trạng thái.
- Không đánh dấu hoàn tất chỉ vì có code hoặc build qua. Cần bằng chứng phù hợp: kết quả test, video thao tác, log đã loại dữ liệu riêng tư hoặc biên bản diễn tập.
- Mỗi đợt có người thực hiện và người xác nhận; khi làm một mình, thực hiện lượt kiểm tra độc lập sau lượt sửa.

## 4. Giai đoạn A — Chốt nghiệp vụ và sửa tính đúng đắn (P0)

### A1. Check-in, XP, phạt và tính đồng thời

Khu vực chính: `checkin`, `reward`, `penalty`, `streak`, `pomodoro` và các bảng liên quan.

- [ ] Viết bảng chuyển trạng thái check-in: chưa có → hoàn thành/bỏ qua/thất bại; hoàn thành → hoàn thành; hoàn thành → thất bại; thất bại → hoàn thành; sửa ghi chú.
- [ ] Chốt cách hoàn/điều chỉnh XP và phạt khi đổi trạng thái. Lưu căn cứ điểm tại thời điểm phát sinh để sửa điểm habit sau này không làm sai lịch sử.
- [ ] Request lặp cùng một hành động không tạo thêm XP, phạt, huy hiệu hoặc phần thưởng; retry sau timeout phải an toàn.
- [ ] Bảo vệ bằng transaction, ràng buộc unique và chiến lược khóa phù hợp trên PostgreSQL; không chỉ khóa nút ở giao diện.
- [ ] Kiểm tra các hành động khác nhau chạy đồng thời: check-in + nhận thưởng, hai lần nhận thưởng, Pomodoro + check-in, hai lần sử dụng freeze và tạo habit vượt quota.
- [ ] Quyết định quan hệ giữa XP tích lũy để lên cấp và số dư dùng đổi thưởng; giao diện phải giải thích đúng mô hình đã chọn.
- [ ] Kiểm tra quyền nhận XP Pomodoro ở server, chống gửi lặp và khai báo hoàn thành không hợp lệ.
- [ ] Nếu có dữ liệu đã bị sai, viết công cụ đối soát và phương án sửa có bản sao lưu; không tự suy đoán rồi sửa hàng loạt dữ liệu người dùng.

Nghiệm thu: gửi cùng một check-in hoàn thành 10 lần chỉ có một tác động hợp lệ; các chuyển trạng thái khớp bảng nghiệp vụ; test đồng thời trên PostgreSQL không mất cập nhật, không vượt quota và không tạo số dư sai.

### A2. Ngày, lịch và streak

- [x] Dùng nguồn thời gian có thể thay thế trong test (`Clock`); tính ngày nghiệp vụ theo timezone người dùng (đợt 4).
- [x] Thống nhất ngày mặc định backend của check-in, dashboard, journal, mood, stats, weekly review, challenge, Pomodoro và reminder (đợt 4).
- [ ] Chốt ngày bắt đầu tuần, quyền check-in bù, giới hạn ngày quá khứ/tương lai và hành vi khi người dùng đổi timezone.
- [ ] Chốt streak cho ngày nghỉ, habit bị tắt, habit mới tạo, SKIPPED, FAILED và freeze.
- [ ] Kiểm tra streak dài hơn cửa sổ truy vấn hiện tại (code đang dùng danh sách 100 ngày); không hiển thị chuỗi dài sai do giới hạn truy vấn.
- [ ] Thống nhất cách frontend gửi ngày nghiệp vụ; tránh chuyển ngày địa phương sang UTC rồi mất một ngày.

Nghiệm thu: test qua 23:59/00:00, đầu tuần/tháng/năm, năm nhuận, Asia/Ho_Chi_Minh và một timezone có DST; dashboard và lịch sử trả cùng kết quả cho cùng ngày nghiệp vụ.

### A3. Phân quyền và validation

- [ ] Lập ma trận tất cả API theo yêu cầu đăng nhập, chủ sở hữu tài nguyên và quyền Premium.
- [ ] Test hai tài khoản đọc/sửa/xóa tài nguyên của nhau qua ID: habit, check-in, goal, journal, reminder, reward, export và các tài nguyên còn lại.
- [ ] Kiểm tra độ dài, khoảng giá trị, ngày, enum, danh sách ID; client không quyết định userId, XP, tier hoặc quota.
- [ ] Giới hạn kích thước request, khoảng thời gian truy vấn, số lượng trả về; thêm phân trang nơi dữ liệu tăng theo thời gian.
- [ ] Kiểm tra export CSV với nội dung bắt đầu bằng ký tự công thức để tránh thực thi công thức khi mở bằng bảng tính.

Nghiệm thu: không có đường đọc/ghi dữ liệu chéo user; request không hợp lệ trả lỗi có cấu trúc, không lộ stack trace hoặc dữ liệu nội bộ.

## 5. Giai đoạn B — Tài khoản, an toàn và quyền dữ liệu (P1)

### B1. Vòng đời tài khoản

- [ ] Xác minh email và xác định chức năng được dùng trước khi xác minh.
- [ ] Quên mật khẩu bằng email OTP thật theo mục 15: xác minh OTP rồi cấp quyền đặt lại mật khẩu ngắn hạn, dùng một lần; không tiết lộ email đã đăng ký qua thông báo hoặc hành vi dễ phân biệt.
- [ ] Giới hạn gửi email/reset; xử lý gửi thất bại và gửi lại. Dùng nhà cung cấp email có hạn mức và theo dõi khả năng giao thư.
- [ ] Kiểm tra thời hạn phiên, thu hồi phiên, đăng xuất mọi thiết bị và hành vi frontend khi đổi mật khẩu.
- [ ] Rà soát thuật toán hash mật khẩu, chi phí tính toán và kế hoạch nâng cấp hash khi cần.
- [ ] Quyết định lưu phiên web: ưu tiên cookie HttpOnly/Secure với bảo vệ CSRF nếu chuyển sang cookie; nếu giữ bearer token phải ghi rõ biện pháp hạn chế XSS và tuổi thọ token.
- [ ] Với Capacitor, chọn cơ chế lưu token phù hợp thiết bị và kiểm chứng riêng; không mặc định localStorage đủ cho mọi nền tảng.

### B2. Chống lạm dụng và bảo vệ dữ liệu

- [ ] Rate limit đăng nhập, đăng ký, reset, export và endpoint tốn tài nguyên; kết hợp theo tài khoản/IP, chỉ tin proxy header từ nguồn đã cấu hình.
- [ ] HTTPS, CORS allowlist, rà soát CSP và các security header; không cho wildcard kèm credentials.
- [ ] Không log mật khẩu, token, nội dung nhật ký hoặc connection string chứa secret; có request ID để tra lỗi.
- [ ] Scan secret/dependency frontend, backend và image; xử lý lỗ hổng khai thác được hoặc ghi quyết định có căn cứ.
- [ ] Thực hiện xóa tài khoản sau xác thực lại, thu hồi phiên và xóa/ẩn danh dữ liệu liên quan theo chính sách công bố.
- [ ] Công bố chính sách quyền riêng tư, lưu giữ dữ liệu, xóa dữ liệu trong backup và kênh hỗ trợ; nội dung phải đúng hành vi thực tế.
- [ ] Export dữ liệu cá nhân có phạm vi rõ ràng; nếu cần xuất đầy đủ thì bổ sung ngoài CSV 90 ngày hiện có.

Nghiệm thu: thử từ đầu đến cuối email xác minh/reset hết hạn/reset dùng lại/xóa tài khoản; không thể dùng token cũ sau thu hồi; rate limit trả lỗi rõ và không khóa nhầm toàn bộ người dùng sau một proxy.

## 6. Giai đoạn C — Hoàn thiện trải nghiệm và chức năng được công bố (P1)

### C1. Nghiệm thu các luồng hằng ngày

- [ ] Onboarding: đăng ký → tạo thói quen đầu tiên → check-in → xem kết quả, không cần người phát triển hướng dẫn.
- [ ] Kiểm tra tạo/sửa/tắt/sắp xếp habit và template; thống kê, challenge và lịch sử không bị sai sau thay đổi habit.
- [ ] Journal, mood, goal, weekly review: lưu, mở lại, sửa và xem lịch sử; không báo thành công trước khi server xác nhận.
- [ ] Dashboard, heatmap, XP, level, combo và achievements dùng quy tắc server; bỏ thông điệp như nhân XP nếu backend chưa thực hiện.
- [ ] Pomodoro giữ thời gian đúng khi chuyển tab, khóa màn hình, refresh hoặc app chuyển nền; server xác nhận kết quả hợp lệ.
- [ ] Mọi trang có loading, empty, error và retry; giữ nội dung đang nhập khi lỗi mạng và cảnh báo trước khi bỏ thay đổi chưa lưu.
- [ ] Kiểm tra ký tự tiếng Việt, nội dung dài, ngày giờ, theme, màn hình nhỏ, bàn phím ảo và vùng chạm.
- [ ] Kiểm tra bàn phím, focus modal, label, tương phản, trình đọc màn hình và giảm chuyển động; đặt mục tiêu WCAG 2.2 AA cho luồng chính.
- [ ] Ẩn hoặc giải thích rõ Premium chưa bán; không có nút thanh toán/kích hoạt gây hiểu nhầm.

### C2. Nhắc nhở hoạt động thực tế

- [ ] Chốt kênh đầu tiên: Web Push cho PWA trên môi trường hỗ trợ; thông báo local cho bản Capacitor khi triển khai mobile.
- [ ] PWA: quản lý permission/subscription, service worker, lịch gửi theo timezone và cơ chế xử lý endpoint push hết hạn.
- [ ] Thiết kế scheduler bền vững, chống gửi trùng, retry có giới hạn và chính sách bỏ qua thông báo quá hạn. Không dựa vào tab đang mở.
- [ ] Scheduler trên backend ngủ không bảo đảm gửi đúng lịch: chọn nơi chạy lịch có thể đáp ứng hoặc chưa quảng bá nhắc nhở tự động trong beta.
- [ ] Tắt/xóa/sửa reminder, logout và đổi tài khoản phải hủy hoặc cập nhật lịch phù hợp; xử lý nhiều thiết bị.
- [ ] Mặc định thông báo không lộ nội dung nhật ký hoặc thông tin riêng tư trên màn hình khóa.
- [ ] Giao diện hiển thị đúng khi người dùng từ chối permission hoặc thiết bị không hỗ trợ; không báo “đã bật” khi chưa thể giao thông báo.

Nghiệm thu: lưu bằng chứng trên thiết bị thật khi app đóng/chạy nền, qua đổi ngày/timezone, từ chối quyền, mất mạng và sửa lịch. Công bố giới hạn do hệ điều hành; không hứa giao chính xác tuyệt đối.

## 7. Giai đoạn D — PWA và thiết bị mobile (P1 cho web, P2 cho store)

- [ ] Bổ sung manifest, tên/icon, standalone display, màu giao diện và hướng dẫn cài đặt phù hợp nền tảng.
- [ ] Cache tài nguyên tĩnh có version; không cache mù API hoặc dữ liệu riêng tư dùng chung giữa các tài khoản.
- [ ] Có màn hình offline rõ ràng. Bản đầu yêu cầu mạng để ghi dữ liệu; không hiển thị check-in thành công khi chưa đồng bộ.
- [ ] Có quy trình cập nhật service worker, tránh dùng frontend cũ với API mới và tránh mất nội dung đang nhập.
- [ ] Kiểm tra Chrome Android và Safari iOS trên thiết bị thật, desktop Chrome/Firefox/Safari khi có môi trường; simulator không thay thế toàn bộ kiểm tra thiết bị.

Nghiệm thu: đăng ký, check-in, journal, stats, logout và mở lại app hoạt động trên ma trận hỗ trợ; không tràn ngang ở màn hình 360px; dữ liệu user trước không xuất hiện sau đổi tài khoản.

## 8. Giai đoạn E — Hạ tầng, dữ liệu và khả năng phục hồi (P1)

### E1. Build và deploy có thể lặp lại

- [ ] Commit các thay đổi đã review; build từ một commit xác định, không phụ thuộc static bundle cũ trong máy phát triển.
- [ ] Tách local/staging/production bằng database và secret riêng; không dùng nhật ký thật trong test.
- [ ] CI chạy frontend lint/build, backend test và PostgreSQL integration test; xác nhận một lần chạy trên remote.
- [ ] Build/chạy Docker image thực tế; smoke test profile prod, DB mới và DB nâng cấp từ phiên bản trước.
- [ ] Mọi thay đổi schema sau V1 dùng migration mới; ưu tiên migration tương thích ngược, kiểm tra thời gian khóa bảng.
- [ ] Ghi phiên bản phát hành, chuẩn bị rollback app; không giả định rollback image có thể đảo ngược migration phá hủy dữ liệu.
- [ ] Tách health liveness/readiness theo nhu cầu hosting; endpoint public không lộ thông tin DB hoặc secret.

### E2. Ngân sách và tài nguyên

- [ ] Dùng Render Free + Neon Free cho staging/beta theo hướng dẫn có sẵn; xác minh hạn mức hiện hành tại thời điểm tạo dịch vụ.
- [ ] Đo RSS/heap Java, CPU, pool kết nối, dung lượng DB, traffic và thời gian khởi động; cấu hình theo tài nguyên thực tế.
- [ ] Không dùng H2/file trên filesystem tạm để lưu dữ liệu production; không ping liên tục nhằm né chính sách ngủ.
- [ ] Theo dõi usage; trước khi bật gói trả phí phải chốt ngân sách và giới hạn chi tiêu khả dụng với chủ dự án.
- [ ] Nếu cold start, RAM hoặc scheduler không đạt yêu cầu, tối ưu và đo lại; nếu vẫn không đạt thì giữ beta giới hạn hoặc chuyển hạ tầng khi có ngân sách.

### E3. Backup, quan sát và ứng phó

- [ ] Tạo backup tự động, mã hóa và lưu ở vị trí độc lập có kiểm soát quyền; theo dõi backup thất bại.
- [ ] Mục tiêu ban đầu: RPO ≤ 24 giờ (mất dữ liệu tối đa), RTO ≤ 4 giờ (khôi phục dịch vụ). Đây là mục tiêu cần diễn tập, chưa phải cam kết đã đạt.
- [ ] Restore vào database riêng, kiểm tra số bản ghi và luồng đăng nhập/check-in/journal; ghi thời gian thực tế.
- [ ] Theo dõi uptime, 5xx, latency, RAM, kết nối DB và lỗi giao thông báo; cảnh báo phải tới người có thể xử lý.
- [ ] Có runbook cho hết RAM, DB không kết nối, migration lỗi, deploy lỗi, sai XP, mất dữ liệu và lộ secret.
- [ ] Có kênh báo lỗi/hỗ trợ, người trực nhận thông tin và cách thông báo sự cố cho người dùng.

Nghiệm thu: dữ liệu còn sau redeploy/restart; restore thành công; cảnh báo được thử bằng sự cố giả lập an toàn trên staging; rollback đã diễn tập.

## 9. Giai đoạn F — Kiểm chứng tải và beta 5 → 30 → 100 người

Các ngưỡng dưới đây là mục tiêu ban đầu để đo, không phải kết quả hiện tại hoặc bảo đảm của gói miễn phí.

| Bài kiểm tra | Phạm vi | Điều kiện đạt đề xuất |
|---|---|---|
| E2E | Đăng ký, login, habit, check-in, journal, stats, reset và logout | Tất cả luồng bắt buộc qua trên ma trận hỗ trợ |
| Tải thường | 100 tài khoản dữ liệu thử, 10 người thao tác đồng thời với khoảng nghỉ thực tế trong 30 phút | p95 API chính < 1 giây khi đã khởi động; 5xx < 1%; không OOM hoặc sai dữ liệu |
| Tải tăng | 30 người thao tác đồng thời trong 10 phút | Không mất dữ liệu; giới hạn có kiểm soát, ghi rõ latency và khả năng phục hồi |
| Tranh chấp | Request đồng thời cùng user/check-in/reward | Kết quả khớp nghiệp vụ, không cộng/trừ lặp hoặc vượt quota |
| Dữ liệu lâu dài | Dữ liệu giả lập 100 user × khoảng 10 habit × một năm | Dashboard/stats/export không truy vấn không giới hạn; ghi dung lượng và p95 |
| Cold start | Mở sau thời gian dịch vụ ngủ | Đo riêng, hiển thị chờ/lỗi đúng; không trộn với chỉ số khi đã khởi động |
| Phục hồi | Restart, redeploy, restore và rollback staging | Dữ liệu đúng; đạt RPO/RTO hoặc điều chỉnh phương án trước public |

Chỉ tạo tải trên hệ thống được phép thử và trong giới hạn nhà cung cấp; dữ liệu tải là giả lập. Kết quả 10–30 đồng thời không chứng minh đáp ứng 100 đồng thời; nếu mục tiêu đổi thì chạy bài riêng.

### Trình tự beta

1. 5–10 người, 1–2 tuần: quan sát onboarding, check-in và lỗi dữ liệu; thu phản hồi trực tiếp.
2. Khoảng 30 người, 1–2 tuần: kiểm tra nhắc nhở, dùng lại hằng ngày, tải và quy trình hỗ trợ.
3. Khoảng 100 người: chỉ mở rộng khi kết quả trước đó đạt, còn dung lượng và có phương án xử lý sự cố.

- [ ] Theo dõi tỷ lệ tạo habit đầu tiên, check-in đầu tiên, quay lại ngày 1/ngày 7; thu sự kiện tối thiểu, không thu nội dung nhật ký.
- [ ] Ghi nhận nguyên nhân bỏ dùng, phân biệt trải nghiệm sản phẩm với cold start hoặc lỗi kỹ thuật.
- [ ] Không có P0/P1 chưa xử lý thuộc phạm vi phát hành; theo dõi ít nhất 7 ngày ổn định ở nhóm beta trước khi mở rộng.
- [ ] Nếu xuất hiện sai dữ liệu/phân quyền: dừng mở rộng, hạn chế chức năng bị ảnh hưởng, sửa và kiểm chứng rồi mới tiếp tục.

## 10. Giai đoạn G — Android/iOS bằng Capacitor (sau khi lõi ổn định)

- [ ] Đóng gói bundle React bằng Capacitor; backend Java vẫn chạy trên server và gọi qua HTTPS.
- [ ] Cấu hình API origin, CORS, deep link, lưu phiên, safe area, bàn phím và nút Back Android.
- [ ] Tích hợp thông báo local/push theo phạm vi đã chọn; kiểm tra quyền và hành vi chạy nền trên thiết bị thật.
- [ ] Quản lý app ID, version, signing key, quyền truy cập tài khoản store và bản sao lưu khóa ký.
- [ ] Chuẩn bị icon, screenshot, mô tả, URL hỗ trợ/quyền riêng tư, khai báo dữ liệu và xóa tài khoản.
- [ ] Kiểm tra yêu cầu store hiện hành về SDK, kiểm thử, dữ liệu và nội dung trước khi nộp; không coi đóng gói thành công là chắc chắn được duyệt.
- [ ] Android trước khi ngân sách hạn chế; iOS sau khi có môi trường macOS/Xcode và ngân sách tài khoản phù hợp.

Nghiệm thu: cài bản ký lên thiết bị thật, dùng đủ luồng, nâng cấp bản mới không mất phiên/dữ liệu; hoàn thành thử nghiệm/phê duyệt theo từng store trước công bố.

## 11. Giai đoạn H — Premium và thanh toán (chỉ bắt buộc trước thu tiền)

- [ ] Chốt tính năng miễn phí/trả phí, giới hạn và hành vi dữ liệu khi hết hạn/hạ gói.
- [ ] Chọn nhà cung cấp phù hợp thị trường; kiểm tra quy tắc thanh toán digital goods của từng store tại thời điểm phát hành.
- [ ] Server xác minh thanh toán/webhook có chữ ký; chống replay và xử lý sự kiện lặp hoặc sai thứ tự.
- [ ] Xử lý mua thành công, pending, thất bại, gia hạn, hủy, hoàn tiền, hết hạn và khôi phục giao dịch.
- [ ] Không tin tier/giá/trạng thái thanh toán từ frontend; quyền được quyết định ở backend.
- [ ] Có đối soát và hỗ trợ giao dịch; kiểm thử sandbox và tình huống webhook mất/chậm.

Nghiệm thu: không thể tự cấp quyền; giao dịch lặp không cấp trùng; hết hạn/hoàn tiền điều chỉnh quyền đúng; không xóa dữ liệu người dùng vì hạ gói.

## 12. Thứ tự triển khai và ước lượng

Ước lượng sơ bộ cho một người làm toàn thời gian, đã hiểu dự án; cần điều chỉnh sau giai đoạn A. Không bao gồm thời gian chờ duyệt store, chờ email provider hoặc tuyển người beta.

| Đợt | Nội dung | Ước lượng | Phụ thuộc |
|---|---|---|---|
| 1 | A: XP, timezone, nghiệp vụ, phân quyền | 1–2 tuần | Chốt quy tắc chuyển trạng thái |
| 2 | B: tài khoản, rate limit, dữ liệu cá nhân | 1–2 tuần | Đợt 1; email provider |
| 3 | C–D: UX, nhắc nhở và PWA | 2–3 tuần | Lõi ổn định; chọn cơ chế gửi lịch |
| 4 | E–F: hạ tầng, tải, backup và beta | 2–4 tuần | Chức năng đủ để dùng thật; có thể chuẩn bị hạ tầng sớm |
| 5 | G: Capacitor Android rồi iOS | 2–4 tuần hoặc hơn | Web ổn định, thiết bị và ngân sách |
| 6 | H: thanh toán | Ước lượng sau khi chọn mô hình | Chốt giá, provider và nền tảng bán |

Không dùng lịch này làm lý do bỏ qua cổng nghiệm thu. Nếu không có ngân sách vận hành đáp ứng chất lượng, tiếp tục beta có giới hạn thay vì công bố cam kết không thực hiện được.

## 13. Cổng quyết định mở public

### Public web/PWA miễn phí

- [ ] Hoàn thành A–F trong phạm vi tính năng công bố; không còn P0/P1 mở.
- [ ] Không còn cộng/trừ điểm lặp, dữ liệu chéo tài khoản hoặc sai ngày ở các trường hợp đã định nghĩa.
- [ ] Tài khoản có khôi phục, thu hồi phiên, xóa và chính sách dữ liệu hoạt động thực tế.
- [ ] Luồng chính và nhắc nhở được nghiệm thu trên thiết bị hỗ trợ; tính năng chưa hỗ trợ được ghi rõ hoặc ẩn.
- [ ] CI remote, image production, migration, backup/restore và rollback có bằng chứng.
- [ ] Đạt ngưỡng tải đã thống nhất; ghi rõ giới hạn tải, cold start và ngân sách.
- [ ] Có theo dõi lỗi, cảnh báo, kênh hỗ trợ và người xử lý sự cố.
- [ ] Beta đạt điều kiện ổn định và có phản hồi thực tế.

### Công bố trên store hoặc thu tiền

- [ ] Lên store: đạt thêm G và yêu cầu phê duyệt nền tảng.
- [ ] Thu tiền: đạt thêm H; không bán chức năng đang mô phỏng hoặc chưa hoạt động.

## 14. Theo dõi tiến độ và bằng chứng

Tạo issue theo mã A1, A2…; chia mỗi mục lớn thành thay đổi có thể review. Không ghi secret hoặc dữ liệu cá nhân trong issue/báo cáo.

| Mã | Trạng thái | Người thực hiện | Commit/PR | Bằng chứng nghiệm thu | Việc còn lại |
|---|---|---|---|---|---|
| A1 | Đang thực hiện | Codex | Chưa commit | 60 test qua; xem PHASE_1_BATCH_5_RESULTS.md | PostgreSQL, đối soát legacy, vòng đời Pomodoro và các mục còn lại |
| A2 | Đang làm — đợt 4 | Codex | 23/09/2026 | [Kết quả đợt 4](PHASE_1_BATCH_4_RESULTS.md) | Đã thống nhất ngày mặc định; còn quy tắc lịch/streak và rà soát giao diện |
| A3 | Chưa bắt đầu | Chưa phân công | — | — | Ma trận quyền và validation |
| B | Chưa bắt đầu | Chưa phân công | — | — | Tài khoản và dữ liệu |
| C | Chưa bắt đầu | Chưa phân công | — | — | UX và nhắc nhở |
| D | Chưa bắt đầu | Chưa phân công | — | — | PWA/mobile web |
| E | Chưa hoàn thành | Chưa phân công | — | Có Docker/CI/Flyway trong repo | Xác minh online, vận hành và phục hồi |
| F | Chưa bắt đầu | Chưa phân công | — | — | Tải và beta |
| G | Chưa bắt đầu | Chưa phân công | — | — | Capacitor/store |
| H | Chưa bắt đầu | Chưa phân công | — | — | Thanh toán |
| I | Chưa bắt đầu | Chưa phân công | — | — | Đa ngôn ngữ Việt/Anh, định dạng và email |
| AI-2 | Chưa bắt đầu | Chưa phân công | — | — | Tổng kết tuần, kế hoạch mục tiêu và bắt đầu lại; xem AI_PHASE_2_PLAN.md |
| COMPANION-3 | Chưa bắt đầu | Chưa phân công | — | — | Bạn đồng hành, XP và ba hình thái; xem COMPANION_PHASE_3_PLAN.md |

Mỗi lần hoàn thành một đợt, cập nhật bảng và báo cáo kết quả: thay đổi gì, đã kiểm chứng thế nào, hạn chế nào còn tồn tại và đủ điều kiện chuyển sang đợt tiếp theo hay chưa.

## 15. Yêu cầu bổ sung: tài khoản thật, doanh thu và thị trường quốc tế

Được chủ dự án yêu cầu ngày 22/09/2026. Đây là phạm vi cần triển khai, chưa phải chức năng đã có. Mục tiêu là người dùng đăng ký thật, nhận email thật, thanh toán thật và dùng Premium tự động; không thay thế bằng nút demo, OTP hiển thị trong response hoặc tự cấp tier ở frontend.

### 15.1. B3 — Đăng nhập Google và Facebook

- [ ] Google dùng OpenID Connect/Google Identity Services; Facebook dùng Facebook Login. Backend xác minh kết quả bằng cơ chế chính thức của từng provider, không tin email/user ID do frontend tự khai.
- [ ] Thiết lập ứng dụng OAuth riêng theo môi trường, redirect URI chính xác, secret chỉ ở server; chỉ xin các quyền cần cho đăng nhập.
- [ ] Bảo vệ luồng redirect bằng state, nonce và PKCE theo flow/SDK được chọn; kiểm tra issuer, audience, thời hạn và chữ ký khi nhận ID token.
- [ ] Tạo bảng external identity với unique `(provider, provider_subject)` và liên kết tới user nội bộ; email không phải khóa định danh của provider.
- [ ] Không tự gộp tài khoản chỉ vì email giống nhau. Liên kết thêm provider yêu cầu đăng nhập và xác thực lại tài khoản hiện có; xử lý provider không trả email bằng bước bổ sung email + OTP.
- [ ] Có màn hình quản lý phương thức đăng nhập; không cho gỡ phương thức cuối cùng làm người dùng mất quyền vào tài khoản.
- [ ] Tài khoản chỉ đăng nhập xã hội không bị yêu cầu mật khẩu cũ không tồn tại; tạo mật khẩu nội bộ bằng luồng xác minh email riêng nếu người dùng muốn.
- [ ] Xử lý từ chối quyền, hủy đăng nhập, provider lỗi, callback lặp và tài khoản bị xóa; thông báo được dịch.
- [ ] Cấu hình chế độ phát hành và các yêu cầu xác minh/review của provider để người ngoài nhóm phát triển đăng nhập được.
- [ ] Khi làm iOS, rà soát mục 4.8 của Apple và bổ sung Sign in with Apple hoặc phương án đáp ứng yêu cầu nếu áp dụng; không mặc định chỉ Google/Facebook là đủ cho store.

Nghiệm thu: người ngoài danh sách tester có thể đăng nhập ở môi trường phát hành; không tạo trùng user khi callback lặp; không chiếm tài khoản qua email trùng; dữ liệu/Premium được giữ khi liên kết thêm provider.

### 15.2. B4 — Mật khẩu và xác nhận mật khẩu

| Màn hình | Trường và hành vi bắt buộc |
|---|---|
| Đăng ký email | Email, mật khẩu, nhập lại mật khẩu; gửi OTP; chỉ kích hoạt tài khoản sau xác minh |
| Quên mật khẩu | Nhập email → nhận và xác minh OTP → mật khẩu mới + nhập lại → hoàn tất |
| Đổi mật khẩu | Mật khẩu hiện tại, mật khẩu mới, nhập lại mật khẩu mới; xác minh OTP gửi tới email đã xác minh trước khi thay đổi |
| Thiết lập mật khẩu cho tài khoản xã hội | Xác thực lại phù hợp, xác minh email OTP, mật khẩu mới + nhập lại; không đòi mật khẩu cũ |

- [ ] Kiểm tra khớp mật khẩu ở frontend và backend, thống nhất chính sách độ dài; không trim hoặc tự thay đổi mật khẩu.
- [ ] Có nút hiện/ẩn, label và autocomplete phù hợp; cho phép dán và dùng trình quản lý mật khẩu.
- [ ] Không lưu mật khẩu/nhập lại mật khẩu vào localStorage, log, analytics hoặc email; bản ghi đăng ký chờ chỉ lưu password hash nếu cần giữ trước xác minh.
- [ ] Đổi/reset mật khẩu thành công thu hồi các phiên theo chính sách đã định nghĩa và gửi email thông báo; hướng dẫn đăng nhập lại rõ ràng.

Nghiệm thu: hai mật khẩu không khớp bị từ chối cả khi gọi API trực tiếp; sai mật khẩu cũ hoặc sai OTP không thay đổi dữ liệu; reset không thể dùng lại; lỗi mạng không hiển thị thành công giả.

### 15.3. B5 — Gửi email OTP thực tế

- [ ] Tích hợp email giao dịch qua API/SMTP, cấu hình domain người gửi và SPF/DKIM/DMARC phù hợp; kiểm tra khả năng giao thư đến các hộp thư thật.
- [ ] OTP sinh bằng bộ sinh số ngẫu nhiên mật mã. Mặc định đề xuất: 6 chữ số, hạn 5 phút, tối đa 5 lần thử/challenge, gửi lại sau 60 giây; điều chỉnh theo kiểm thử và theo dõi lạm dụng.
- [ ] Ràng buộc challenge với user/email, mục đích (REGISTER/RESET_PASSWORD/CHANGE_PASSWORD/SET_PASSWORD) và phiên hoặc yêu cầu tương ứng; mã đăng ký không dùng đổi mật khẩu.
- [ ] Lưu bộ kiểm chứng OTP bằng HMAC với secret server hoặc cơ chế tương đương bảo vệ mã có không gian nhỏ; không lưu plaintext hay chỉ hash nhanh không khóa.
- [ ] OTP dùng một lần, tiêu thụ nguyên tử trong transaction; gửi lại vô hiệu challenge trước theo chính sách rõ ràng. Giới hạn cả số lần thử tích lũy và số challenge để không reset bộ đếm bằng gửi lại.
- [ ] Sau OTP reset hợp lệ, cấp quyền đặt lại mật khẩu ngắn hạn, dùng một lần, ràng buộc đúng user và mục đích; không cho sửa userId/email sau xác minh.
- [ ] Rate limit theo tài khoản/email/IP và giới hạn gửi toàn hệ thống; phản hồi không tiết lộ tài khoản tồn tại hay không.
- [ ] Gửi email qua outbox/queue bền vững hoặc cơ chế retry có theo dõi; lưu trạng thái gửi, bounce và lỗi provider, không log OTP.
- [ ] Dọn đăng ký chờ và challenge hết hạn; không giữ email người khác vô thời hạn bằng đăng ký chưa xác minh.
- [ ] Mẫu email Việt/Anh: mã, mục đích, hạn dùng, hướng dẫn nếu không phải người nhận yêu cầu; không đính kèm mật khẩu.

Nghiệm thu: nhận email thật và hoàn thành cả ba luồng đăng ký/quên/đổi mật khẩu; kiểm tra mã hết hạn, sai mục đích, quá số lần thử, gửi lại, hai request xác minh đồng thời, provider lỗi và retry. Không đưa OTP vào response sản phẩm để vượt bước email.

### 15.4. H1 — Chuyển khoản tự động mở Premium

Luồng bắt buộc: chọn gói → backend tạo đơn → hiển thị QR/thông tin chuyển khoản với mã đơn → nhà cung cấp báo giao dịch → server xác minh và đối soát → ghi nhận thanh toán và cấp quyền → frontend cập nhật Premium không cần đăng xuất.

- [ ] Chọn nhà cung cấp có webhook/API giao dịch phù hợp tài khoản ngân hàng và chủ thể kinh doanh của dự án. SePay là một ứng viên để đánh giá, chưa chốt tích hợp hay phí.
- [ ] Mỗi đơn lưu user, gói, giá, tiền tệ, thời hạn, mã tham chiếu duy nhất và phiên bản quyền lợi ở server; tiền VND lưu số nguyên, không dùng số thực cho tính tiền.
- [ ] QR chỉ giúp chuyển khoản, không tự chứng minh đã nhận tiền. Không cấp Premium theo trang redirect, ảnh biên lai hoặc nút “Tôi đã chuyển khoản”.
- [ ] Xác thực webhook theo cơ chế chính thức của provider (chữ ký hoặc credential phù hợp), bảo vệ secret và chống replay; kiểm tra tài khoản nhận, chiều tiền vào, số tiền, tiền tệ, mã tham chiếu và trạng thái giao dịch.
- [ ] Mỗi transaction/event có unique key; lưu payment event và cập nhật đơn/quyền trong transaction, webhook lặp không gia hạn nhiều lần. Hai giao dịch khác nhau chuyển vào cùng đơn phải được phát hiện và xử lý riêng.
- [ ] Tách trạng thái đơn (PENDING/PAID/EXPIRED/CANCELLED/REVIEW/REFUNDED) với trạng thái entitlement; định nghĩa chuyển trạng thái hợp lệ, không hạ PAID về PENDING vì sự kiện đến chậm.
- [ ] Thiếu/thừa tiền, sai nội dung, sai tiền tệ, chuyển sau hết hạn hoặc không tìm thấy đơn đưa vào đối soát; hiển thị hướng dẫn và có đường xử lý hỗ trợ, không tự đoán người trả.
- [ ] Nếu webhook mất, job đối soát API nhà cung cấp khôi phục giao dịch; mọi nhánh dùng cùng logic chống cấp trùng. Chỉ xác nhận webhook sau khi đã lưu bền vững hoặc đưa vào hàng đợi bền vững.
- [ ] Frontend polling có giới hạn/backoff hoặc SSE, kiểm tra ownership đơn; khi PAID thì tải lại user/quyền, cập nhật PremiumContext và mở chức năng ngay trong phiên đang dùng.
- [ ] Mục tiêu nghiệm thu: p95 từ lúc backend nhận sự kiện hợp lệ đến UI mở quyền ≤ 10 giây khi hệ thống hoạt động bình thường. Độ trễ ngân hàng/provider được đo riêng, không hứa “ngay lập tức” trước khi nhận xác nhận tiền.
- [ ] Gia hạn cộng thời hạn theo quy tắc đã chốt, không làm mất thời gian còn lại; có hết hạn, hoàn tiền, thu hồi quyền và lịch sử giao dịch.
- [ ] Gửi xác nhận thanh toán qua email; có công cụ đối soát tối thiểu, audit thao tác hỗ trợ và quyền truy cập phù hợp.
- [ ] Chuyển khoản QR trước hết phục vụ web tại Việt Nam. Để người nước ngoài trả tiền, đánh giá thêm phương thức quốc tế hỗ trợ chủ thể nhận tiền của dự án, phí, tiền tệ và nghĩa vụ liên quan trước khi chọn provider.
- [ ] Bản mobile bán tính năng số phải tuân theo quy tắc thanh toán của từng store/thị trường; không tự đưa QR web vào mọi bản Android/iOS như một cách thay thế billing.

Nghiệm thu: sandbox bao phủ giao dịch hợp lệ/lặp/giả/sai tiền/đến muộn/mất webhook, crash giữa xử lý và đối soát lại. Trước mở bán, thực hiện giao dịch thật giá trị nhỏ do chủ dự án chủ động thanh toán; quyền mở đúng một lần và có thể sử dụng API Premium, không chỉ thay badge.

### 15.5. I — Đa ngôn ngữ và trải nghiệm quốc tế

Phạm vi đầu tiên đề xuất: tiếng Việt và tiếng Anh. Các ngôn ngữ khác bổ sung theo người dùng thực tế; thiết kế không gắn cứng hai ngôn ngữ vào logic nghiệp vụ.

- [ ] Đưa chuỗi giao diện vào tài nguyên dịch có key ổn định; chọn thư viện i18n phù hợp React, hỗ trợ nội suy, số nhiều và fallback.
- [ ] Dịch toàn bộ auth/OTP, onboarding, navigation, form/validation, empty/error, notification, Premium/checkout, email, hướng dẫn và nội dung hỗ trợ/quyền riêng tư được công bố.
- [ ] Backend trả mã lỗi ổn định và tham số an toàn; frontend ánh xạ theo locale, không buộc người dùng nước ngoài đọc exception tiếng Việt.
- [ ] Chọn ngôn ngữ lúc chưa đăng nhập và trong hồ sơ; ưu tiên lựa chọn đã lưu, sau đó hồ sơ, rồi ngôn ngữ trình duyệt với fallback đã định nghĩa.
- [ ] Lưu locale của yêu cầu đăng ký/OTP trước khi có tài khoản, dùng locale hồ sơ cho email và thông báo sau đó.
- [ ] Dùng Intl cho ngày, giờ, số và tiền tệ. Locale độc lập timezone và tiền tệ thanh toán; đổi ngôn ngữ không tự đổi giá hoặc gói.
- [ ] Dịch category/template do hệ thống cung cấp bằng mã ổn định; không tự dịch hay sửa nhật ký/tên habit do người dùng viết.
- [ ] Kiểm tra chuỗi tiếng Anh dài, số nhiều, font, màn hình nhỏ, screen reader và thuộc tính lang của tài liệu; không cắt mất nội dung quan trọng.
- [ ] Kiểm tra thiếu key ở CI và rà soát bản dịch bởi người có khả năng ngôn ngữ phù hợp trước công bố.

Nghiệm thu: một người chỉ đọc tiếng Anh có thể tự đăng ký, nhận OTP, khôi phục tài khoản, tạo habit, check-in, mua gói bằng phương thức được hỗ trợ và tìm trợ giúp; không còn key dịch thô hoặc lỗi bắt buộc đọc tiếng Việt trong các luồng đó.

### 15.6. Thứ tự và điều kiện phát hành cập nhật

1. Sửa P0 (A), đồng thời thiết kế dữ liệu tài khoản/identity/payment/locale; migrations mới sau V1.
2. Làm nền tảng i18n Việt/Anh trước khi viết thêm màn hình auth/checkout để tránh hardcode mới.
3. Hoàn thành B4–B5 (mật khẩu + OTP email thật), sau đó B3 (Google/Facebook); kiểm thử account linking xuyên suốt.
4. Hoàn thành H1 cho web và cập nhật quyền Premium trong phiên; kiểm thử entitlement backend trước khi mở bán.
5. Nghiệm thu các luồng trên cả Việt/Anh, vận hành E và beta F; thu thập phản hồi từ người dùng hai nhóm ngôn ngữ.
6. Làm G khi đủ điều kiện; bổ sung yêu cầu đăng nhập/thanh toán riêng của store.

Mốc public miễn phí vẫn có thể đi trước thanh toán. Mốc public thương mại theo yêu cầu mới phải có H1 và I hoàn thành, email thật hoạt động, các phương thức đăng nhập được công bố đã qua nghiệm thu, cùng các cổng A–F. Đăng nhập provider “sau này” có thể phát hành theo đợt nhưng không hiển thị nút chưa dùng được.

Ước lượng ở mục 12 cần lập lại sau khi chọn email/payment provider; không coi phần OAuth, OTP, đối soát và i18n bổ sung đã nằm trọn trong ước lượng cũ.

Thông tin cần có khi bắt đầu tích hợp: domain gửi email, tài khoản email provider, Google/Meta developer app, tài khoản nhận tiền và provider webhook. Lưu credential trong secret manager/biến môi trường, không đưa vào tài liệu hoặc yêu cầu gửi secret trong chat. Có thể làm code, migration, mock contract và sandbox trước; chỉ đánh dấu giao dịch/email thật đạt sau kiểm chứng thực tế.

Tài liệu tham khảo chính thức đã đối chiếu khi bổ sung kế hoạch:

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
- [SePay webhook](https://developer.sepay.vn/vi/sepay-webhooks/tao-webhook) và [Test Mode](https://docs.sepay.vn/test-mode.html).
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), đặc biệt đăng nhập và thanh toán; kiểm tra lại tại thời điểm nộp store.

## 16. Giai đoạn sản phẩm 2 — AI hỗ trợ duy trì thói quen

Theo yêu cầu chủ dự án, AI được đưa vào giai đoạn nâng cấp thứ hai, sau khi lõi public đạt các cổng nghiệm thu. Đây là giai đoạn sản phẩm, không phải “đợt 2 — tài khoản” trong bảng triển khai mục 12. Không yêu cầu chờ phát hành store mới được thử AI trên web.

Phạm vi bản AI đầu tiên: (1) tổng kết tuần có căn cứ; (2) biến mục tiêu thành kế hoạch để người dùng duyệt; (3) chế độ bắt đầu lại trong 3 ngày sau khi mất nhịp. Phản hồi nhật ký, lập kế hoạch hôm nay và Chat Coach thuộc các đợt mở rộng sau.

AI không tự tính lại số liệu, streak, XP hoặc sửa dữ liệu nghiệp vụ. Nhật ký chỉ được đưa vào ngữ cảnh khi người dùng chủ động bật. Chi phí AI có ngân sách/quota riêng và không nằm trong ước tính vận hành trước đó.

Chi tiết nghiên cứu, luồng người dùng, thiết kế kỹ thuật, kiểm thử, chi phí và điều kiện phát hành nằm trong [AI_PHASE_2_PLAN.md](AI_PHASE_2_PLAN.md). Trạng thái: chỉ lập kế hoạch, chưa tích hợp provider hoặc gửi dữ liệu người dùng tới AI.

## 17. Giai đoạn sản phẩm 3 — Bạn đồng hành

Mục tiêu: người dùng hoàn thành thói quen/nhiệm vụ ngoài đời, bạn đồng hành nhận XP theo điểm cơ sở đã chốt và lớn lên. Bản đầu thử một nhân vật với ba hình thái; chỉ mở thêm 2–3 nhân vật sau beta.

Không có chiến đấu, gacha, thức ăn, nhiệm vụ chăm thú, mua XP hoặc phạt thú khi người dùng bỏ lỡ. Không gọi AI tạo ảnh khi lên cấp; tạo sẵn bộ asset ở giai đoạn thiết kế. Tiến độ thú cưng độc lập số dư điểm có thể tiêu, nhưng dùng cùng sự kiện hoàn thành đã được xác minh; không thêm thao tác đổi điểm.

Chi tiết quy tắc chống XP lặp, đảo điểm khi sửa check-in, ngưỡng phát triển, bộ ảnh, kỹ thuật, chi phí và tiêu chí beta nằm trong [COMPANION_PHASE_3_PLAN.md](COMPANION_PHASE_3_PLAN.md). Điều kiện tiên quyết là tính đúng đắn của XP/lịch ở Phase 1; AI Phase 2 không có quyền cấp XP. Trạng thái: mới lập kế hoạch, chưa thay đổi chức năng hoặc tạo ảnh.

### Cập nhật đợt 18 — 26/09/2026
Dashboard và nhật ký đã có Việt/Anh, định dạng ngày không lệch timezone. Bỏ hứa thưởng Combo x1.5 chưa được backend thực hiện. 15 frontend tests qua, lint không lỗi, build/package thành công. Chưa deploy; chi tiết tại [báo cáo đợt 18](PHASE_1_BATCH_18_RESULTS.md).

### Cập nhật đợt 19 — 26/09/2026
Thống kê, tổng kết tuần và màn hình chặn Premium đã có Việt/Anh. Sửa nhãn chênh lệch tỷ lệ tháng thành điểm phần trăm; phân biệt lỗi tải review với dữ liệu trống. 16 frontend tests qua, lint không lỗi, build/package thành công; chưa kiểm thử trực tiếp trình duyệt, chưa deploy. Chi tiết tại [báo cáo đợt 19](PHASE_1_BATCH_19_RESULTS.md).

### Cập nhật đợt 20 — 26/09/2026
Pomodoro có Việt/Anh, thời gian theo timezone hồ sơ và trạng thái tải/lỗi/thử lại cho dữ liệu phụ. 16 frontend tests, lint, build/package qua; chưa deploy, vòng đời phiên qua reload vẫn còn mở. Xem [báo cáo đợt 20](PHASE_1_BATCH_20_RESULTS.md) và [ước lượng phần việc còn lại](REMAINING_UPGRADE_ESTIMATE.md).

### Cập nhật đợt 21 — 26/09/2026
Khôi phục Pomodoro qua reload/điều hướng trong cùng tab, giữ pause/deadline theo tài khoản; chặn đổi chế độ khi còn phiên và xác nhận trước khi reset. 19 frontend tests qua, build/package thành công; chưa deploy. Start timeout/đồng bộ server vẫn còn mở. Xem [báo cáo đợt 21](PHASE_1_BATCH_21_RESULTS.md).

### Cập nhật đợt 22 — 27/09/2026
Bắt đầu Pomodoro hỗ trợ requestId chống tạo phiên trùng khi retry; frontend giữ payload trước gửi và khôi phục thời gian từ server. V6, 113 backend tests và 19 frontend tests qua; chưa kiểm chứng PostgreSQL V4–V6, chưa deploy. Xem [đợt 22](PHASE_1_BATCH_22_RESULTS.md).

### Cập nhật đợt 23 — 27/09/2026
Phân loại lỗi start Pomodoro, kiểm tra pending trước khi gửi và thêm thao tác bỏ bản lưu cục bộ bị hỏng/xung đột. 23 frontend tests qua, build/package thành công, chưa deploy. Xem [đợt 23](PHASE_1_BATCH_23_RESULTS.md).

### Cập nhật đợt 24 — 05/10/2026
Bổ sung test 6 start Pomodoro đồng thời và tách requestId giữa tài khoản; sửa assertion migration PostgreSQL sau restart. 115 backend tests local qua, đóng gói thành công. PostgreSQL V4–V6 vẫn chờ Docker engine hoạt động; chưa deploy. Xem [đợt 24](PHASE_1_BATCH_24_RESULTS.md).

### Cập nhật đợt 25 — 05/10/2026
Đã kiểm chứng PostgreSQL V1–V6: 115 test thường + 41 test tích hợp qua, bao gồm start Pomodoro đồng thời và restart. Trang Thử thách có Việt/Anh, báo lỗi và thử lại danh sách/tiến độ. 23 frontend tests, lint/build/package qua; chưa deploy hoặc nghiệm thu UI thiết bị thật. Xem [đợt 25](PHASE_1_BATCH_25_RESULTS.md).

### Cập nhật đợt 26 — 05/10/2026
Khóa tạo/xóa challenge đang gửi, giữ form khi lỗi, thêm giới hạn nội dung API/UI và label truy cập. 117 backend tests + 23 frontend tests qua; build/package thành công, chưa deploy. Idempotency challenge sau timeout/reload vẫn mở. Xem [đợt 26](PHASE_1_BATCH_26_RESULTS.md).

### Cập nhật đợt 27 — 05/10/2026
Challenge create có requestId, receipt V7 và pending UI theo tài khoản; retry sau timeout không tạo trùng, sau xóa không hồi sinh resource. 119 backend + 43 PostgreSQL + 26 frontend tests qua; build/package thành công, chưa deploy. Xem [đợt 27](PHASE_1_BATCH_27_RESULTS.md).

### Cập nhật đợt 28 — 05/10/2026
DELETE challenge có thể thử lại khi mất response: 204 nếu không có bản ghi thuộc tài khoản hiện tại, không xóa dữ liệu tài khoản khác. Test delete đồng thời/quyền sở hữu qua; 121 backend + 44 PostgreSQL tests đạt, build thành công, chưa deploy. Xem [đợt 28](PHASE_1_BATCH_28_RESULTS.md).

### Cập nhật đợt 29 — 05/10/2026
Nhật ký phân biệt 404 với lỗi mạng, bỏ phản hồi cũ khi đổi ngày, khóa form/chuyển ngày khi lưu và cảnh báo bỏ chỉnh sửa. 29 frontend tests qua, build/package thành công, chưa deploy. Xem [đợt 29](PHASE_1_BATCH_29_RESULTS.md).

### Cập nhật đợt 30 — 06/10/2026
Nhật ký có bản nháp sessionStorage theo tài khoản/ngày, khôi phục hoặc xóa do người dùng chọn và phân biệt rõ chưa lưu server. 31 frontend tests, lint/build/package qua; chưa deploy, chưa nghiệm thu UI thiết bị thật. Xem [đợt 30](PHASE_1_BATCH_30_RESULTS.md).

### Cập nhật đợt 31 — 06/10/2026 (gộp nhiều hạng mục)
Hoàn thiện Việt/Anh và trạng thái thao tác/lỗi trên Rewards, Reminders, Profile; kiểm tra lịch nhắc ở API; sửa CSV công thức, khoảng 90 ngày và lỗi lazy-loading khi xuất check-in. 127 backend tests + 32 frontend tests qua, build/package thành công. PostgreSQL đợt này bị chặn bởi Docker, không có migration mới; chưa deploy. Xem [đợt 31](PHASE_1_BATCH_31_RESULTS.md).

### Batch 32 — Quản lý phiên đăng nhập (2026-10-06)
Đã thêm API và giao diện Việt/Anh để xem, thu hồi từng phiên hoặc tất cả phiên khác. Frontend kiểm tra đạt; kiểm thử backend đã viết nhưng chưa chạy do hạn mức hệ thống duyệt tự động. Chi tiết: [Batch 32](PHASE_1_BATCH_32_RESULTS.md).

### Batch 33 — Đồng bộ phiên trình duyệt (2026-10-06)
Chặn phản hồi 401 cũ xóa phiên mới; tải lại state khi tab khác đăng nhập/đăng xuất. Thêm kiểm thử hồi quy. Chi tiết: [Batch 33](PHASE_1_BATCH_33_RESULTS.md).

### Batch 34 — Premium và quyền lợi (2026-10-06)
Hoàn thiện Việt/Anh cho trang Premium; sửa mô tả quyền lợi khớp hành vi hiện có, ghi rõ giá dự kiến và thanh toán chưa mở. API status không còn báo giới hạn lịch sử 7 ngày chưa được áp dụng. Chi tiết: [Batch 34](PHASE_1_BATCH_34_RESULTS.md).

### Batch 35 — Tạo bộ thói quen theo giao dịch (2026-10-06)
API tạo 1–10 habit trong một transaction, rollback nếu thiếu quota; UI dùng một request, chống bấm lặp khi đang gửi và có lỗi/thử lại. Chống retry bằng requestId còn mở. Chi tiết: [Batch 35](PHASE_1_BATCH_35_RESULTS.md).

### Batch 36 — Chống tạo lại bộ thói quen (2026-10-06)
Thêm requestId/receipt V8 cho batch habit và khôi phục yêu cầu chờ theo tài khoản ở frontend. Chi tiết: [Batch 36](PHASE_1_BATCH_36_RESULTS.md).

### Batch 37 — Sắp xếp thói quen (2026-10-06)
Sửa validation/quyền sở hữu/transaction API reorder, trả danh sách theo thứ tự đã lưu và thêm nút lên/xuống cho Premium. Chi tiết: [Batch 37](PHASE_1_BATCH_37_RESULTS.md).

### Batch 38 — Phân quyền danh mục (2026-10-06)
Chặn gắn danh mục chéo tài khoản, sửa danh mục hệ thống và ẩn metadata danh mục riêng bị liên kết sai trong dữ liệu cũ; bổ sung giới hạn độ dài habit. Chi tiết: [Batch 38](PHASE_1_BATCH_38_RESULTS.md).

### Batch 39 — Sửa danh mục và độ khó habit (2026-10-07)
Thêm gỡ danh mục rõ ràng, cập nhật điểm khi đổi độ khó mà không đổi lịch sử check-in, từ chối xóa danh mục còn được dùng. Chi tiết: [Batch 39](PHASE_1_BATCH_39_RESULTS.md).

### Batch 40 — Thói quen đã tắt (2026-10-07)
Thêm API/danh sách inactive, chỉnh sửa và khôi phục có quota, giữ lịch sử check-in. Chi tiết: [Batch 40](PHASE_1_BATCH_40_RESULTS.md).

### Batch 41 — Kiểm chứng PostgreSQL (2026-10-07)
Docker đã hoạt động; kiểm thử PostgreSQL qua V8 và các thay đổi đến batch 40 thành công. Chi tiết: [Batch 41](PHASE_1_BATCH_41_RESULTS.md).

### Batch 42 — Lịch sử tâm trạng (2026-10-07)
Sửa lệch N+1 ngày, tuần 7 ngày, giới hạn truy vấn và validation điểm/độ dài. Chi tiết: [Batch 42](PHASE_1_BATCH_42_RESULTS.md).

### Batch 43 — Ghi tâm trạng đồng thời (2026-10-07)
Khóa user khi upsert mood, chặn bấm lặp trên Dashboard và kiểm thử bốn request cạnh tranh. Chi tiết: [Batch 43](PHASE_1_BATCH_43_RESULTS.md).

### Batch 44 — Lỗi tải Dashboard (2026-10-07)
Phân biệt lỗi từng nguồn dữ liệu, có thử lại và chặn ghi mood khi chưa tải được dữ liệu cũ. Chi tiết: [Batch 44](PHASE_1_BATCH_44_RESULTS.md).

### Batch 45 — Check-in/freeze Dashboard (2026-10-07)
Chặn thao tác song song, phân biệt lưu thành công/tải lại lỗi và yêu cầu refresh trước khi tiếp tục. Chi tiết: [Batch 45](PHASE_1_BATCH_45_RESULTS.md).

### Batch 46 — Nhật ký đồng thời (2026-10-07)
Khóa ghi nhật ký theo user và kiểm tra độ dài phù hợp schema. Chi tiết: [Batch 46](PHASE_1_BATCH_46_RESULTS.md).

### Batch 47 — Nhật ký dài (2026-10-07)
Migration V9 mở rộng bốn mục nhật ký lên 5.000 ký tự, đồng bộ API/UI và bộ đếm. Chi tiết: [Batch 47](PHASE_1_BATCH_47_RESULTS.md).

### Batch 48 — Bản nháp dài và ước lượng (2026-10-07)
Chặn lưu bản nháp quá giới hạn mà không cắt nội dung; cập nhật [ước lượng theo mốc](REMAINING_UPGRADE_ESTIMATE.md). Chi tiết: [Batch 48](PHASE_1_BATCH_48_RESULTS.md).
