# SelfForge — Phase 3: Bạn đồng hành phát triển cùng người dùng

Ngày lập: 22/09/2026. Trạng thái: kế hoạch, chưa triển khai hoặc tạo hình ảnh.

Kế hoạch cha: [PUBLIC_PRODUCT_UPGRADE_PLAN.md](PUBLIC_PRODUCT_UPGRADE_PLAN.md), mục 17. Phase 3 là giai đoạn sản phẩm sau nền tảng public và giai đoạn AI; không phải đợt sửa lỗi thứ ba trong lịch triển khai cũ.

## 1. Mục tiêu và giới hạn

Người dùng hoàn thành việc ngoài đời; bạn đồng hành phản ánh tiến bộ bằng XP và thay đổi hình thái. Người dùng không phải quản lý thêm một cuộc sống ảo.

- Bản thử nghiệm: một nhân vật, ba hình thái nhỏ → trưởng thành → tiến hóa.
- Sau khi beta chứng minh hữu ích mới mở rộng thành 2–3 nhân vật để chọn; các nhân vật khác nhau về ngoại hình, không khác sức mạnh hoặc tốc độ nhận XP.
- Một thẻ nhỏ trên Dashboard, một màn hình chi tiết đơn giản và hiệu ứng ngắn khi đạt mốc.
- Không chiến đấu, trang bị, gacha, tiền ảo, thức ăn, nhiệm vụ chăm thú, bảng xếp hạng hoặc thưởng đăng nhập.
- Không đói, bệnh, chết, buồn vì người dùng vắng mặt, mất cấp do bỏ lỡ hoặc lời nhắc gây cảm giác có lỗi.
- Có thể ẩn bạn đồng hành và giảm/tắt chuyển động; ứng dụng vẫn dùng bình thường.
- Không gọi AI tạo ảnh hoặc hội thoại mỗi lần check-in/lên cấp. Không cần một dịch vụ game riêng.

Giả thuyết cần kiểm chứng: hình ảnh tiến bộ khiến người dùng muốn quay lại hoàn thành thói quen đã định. Không coi số lượt mở thẻ thú cưng là bằng chứng người dùng tiến bộ ngoài đời.

## 2. Điều kiện bắt đầu

- [ ] Phase 1 đã sửa XP lặp, timezone, phân quyền và request đồng thời; có quy tắc chuyển trạng thái check-in rõ ràng.
- [ ] Có lịch/ngày nghiệp vụ và điểm nhiệm vụ được chốt theo phiên bản; không lấy điểm hiện tại áp ngược vào lịch sử.
- [ ] Nghiệm thu event/ledger nguồn trước khi thêm XP bạn đồng hành. `RewardService.addXp` hiện nhận một số điểm và `UserLevel.totalXp` có thể bị trừ; không dùng trực tiếp số dư này làm tiến độ thú cưng.
- [ ] Phase 2 không được tự tạo XP, cấp hình thái hoặc thay đổi độ khó qua gợi ý AI chưa được duyệt.
- [ ] Có bản dịch Việt/Anh, feature flag và cách rollback ứng dụng mà không mất lịch sử tiến độ.

Phase 3 độc lập lúc chạy: AI tắt hoặc hết quota không ảnh hưởng bạn đồng hành. Không cần đợi app được duyệt lên store mới thử trên web/PWA.

## 3. Phạm vi MVP và mở rộng

| Phần | MVP | Sau khi beta đạt |
|---|---|---|
| Nhân vật | Một nhân vật gốc, chọn tham gia và đặt tên tùy chọn | Chọn giữa 2–3 nhân vật, đổi ngoại hình vẫn giữ tiến độ |
| Phát triển | Ba hình thái theo XP tích lũy | Thêm hình thái nếu có nhu cầu; không mở cây kỹ năng |
| Nguồn XP | Check-in habit hoàn thành hợp lệ | Xem xét nhiệm vụ một lần khi hệ thống có thực thể nhiệm vụ chuẩn |
| Pomodoro/goals/challenges | Không cộng thêm XP thú cưng để tránh thưởng kép cho cùng việc | Chỉ bổ sung sau khi định nghĩa nguồn độc lập và chống cộng trùng |
| Hiển thị | Thẻ Dashboard và trang chi tiết | Tùy chọn cosmetic nếu không tăng tải nhận thức |
| Kiếm tiền | Bạn đồng hành cơ bản miễn phí | Có thể thử ngoại hình Premium; không bán XP hoặc cứu thú cưng |

Không xây riêng hệ thống “nhiệm vụ ngày” song song habit trong MVP. UI giải thích rõ XP đến từ các lượt thói quen đã hoàn thành hợp lệ.

## 4. Nghiệp vụ XP

### 4.1. Nguồn điểm và độ khó

- [ ] Backend là nơi quyết định điểm; frontend chỉ gửi hành động check-in.
- [ ] Tận dụng bảng điểm nhiệm vụ đã chốt ở Phase 1; hiển thị một lần hoàn thành nhận bao nhiêu XP thú cưng. Không thêm tiền tệ trung gian.
- [ ] Nếu bảng điểm hiện tại chưa phù hợp, đề xuất thử Dễ = 5, Vừa = 10, Khó = 15 XP. Đây là cấu hình thử nghiệm cần chốt trước coding, không tự thay điểm lịch sử hoặc hệ XP hiện có.
- [ ] Mặc định tỷ lệ quy đổi từ điểm cơ sở hợp lệ sang XP bạn đồng hành là 1:1; combo/bonus không tự áp dụng nếu chưa được định nghĩa riêng.
- [ ] Điểm được snapshot theo lượt nhiệm vụ trước khi nhận thưởng. Sửa độ khó chỉ ảnh hưởng lượt tương lai; đổi tên/sửa ghi chú không tạo thêm XP.
- [ ] Hướng dẫn độ khó theo mức nỗ lực cá nhân, không phán xét. Không dùng AI để tự chấm hay nâng độ khó.
- [ ] Cảnh báo nhẹ khi tạo habit tương tự và kiểm soát spam theo quota hiện có; không tuyên bố chống được mọi hành vi chia nhỏ nhiệm vụ để lấy điểm.

### 4.2. Tách tích lũy và số dư

XP bạn đồng hành là tiến độ tích lũy từ các lần hoàn thành hợp lệ. Nhận phần thưởng tùy chỉnh bằng XP hiện có không trừ tiến độ này. Không tự sửa công thức level tài khoản chỉ để thêm thú cưng.

Không quảng bá “không có hệ điểm mới” theo nghĩa dùng chung một số dư: backend cần projection/ledger riêng để không bị ảnh hưởng bởi tiêu điểm và phạt. Với người dùng, chỉ có một hành động hoàn thành; họ không phải đổi điểm hoặc bấm cho ăn để lên cấp.

### 4.3. Request lặp và sửa check-in

| Tình huống | Quy tắc đề xuất |
|---|---|
| Chưa hoàn thành → COMPLETED | Cộng theo snapshot nguồn một lần |
| COMPLETED → COMPLETED, sửa ghi chú, retry | Không cộng thêm |
| COMPLETED → SKIPPED/FAILED hoặc xóa lượt hoàn thành | Đảo tác động của đúng nguồn bằng ledger adjustment; không tạo khoản phạt thêm |
| Sau khi đảo, lại COMPLETED | Khôi phục đúng phần điểm nguồn, không vượt một phần thưởng ròng hợp lệ |
| Bỏ lỡ một lượt chưa hoàn thành | Không cộng, không trừ XP đã kiếm từ lượt khác |
| Tắt/xóa habit | Giữ lịch sử hợp lệ theo chính sách dữ liệu; không tự xóa ledger chỉ vì habit bị ẩn |
| Check-in bù | Áp dụng giới hạn backdate của Phase 1 và điểm snapshot; không mở đường nhận XP vô hạn |

“Không mất cấp khi bỏ lỡ” khác việc sửa dữ liệu đã ghi nhầm. Đề xuất MVP: mức/hình thái hiện tại suy ra từ XP ròng hợp lệ; nếu người dùng hủy check-in khiến xuống mốc thì preview giải thích tiến độ sẽ được điều chỉnh. Không có hoạt ảnh buồn hay thông báo phạt. Cần chốt quy tắc này trước triển khai để tránh vừa hứa không bao giờ mất cấp vừa cho phép đảo điểm.

## 5. Hình thái và nhịp phát triển

- [ ] Bản đầu chỉ dùng ba giai đoạn, không thêm 100 level. Thẻ hiển thị hình thái hiện tại, XP còn thiếu và mốc tiếp theo.
- [ ] Mốc thử nghiệm nếu dùng bảng 5/10/15 XP: nhỏ từ 0; trưởng thành từ 300; tiến hóa từ 1.200 XP.
- [ ] Ví dụ 3 habit mức vừa mỗi ngày = 30 XP/ngày: đạt mốc khoảng ngày 10 và ngày 40 nếu hoàn thành đều. Đây là phép tính minh họa, không hứa người dùng phải đạt theo lịch đó.
- [ ] Khi đạt hình thái cuối, tiếp tục ghi XP nhưng hiển thị “Đã trưởng thành đầy đủ”, không thanh tiến độ kẹt hoặc thúc ép mua thêm nội dung.
- [ ] Mốc XP có version. Thay đổi cân bằng sau phát hành phải có phương án chuyển đổi và thông báo; không tùy tiện làm người dùng mất tiến độ.
- [ ] Không khóa hình thái bằng chuỗi ngày liên tục, không reset theo tuần/tháng.

## 6. Trải nghiệm và hình ảnh

### 6.1. Các màn hình

1. Lời mời tùy chọn: giới thiệu bạn đồng hành lớn lên từ việc hoàn thành thói quen; có “Để sau”.
2. Dashboard: ảnh, tên, giai đoạn, thanh XP có nhãn văn bản; không chiếm vị trí hành động check-in chính.
3. Sau check-in: phản hồi ngắn “Bạn đồng hành nhận +10 XP”; không popup che mọi lần hoàn thành.
4. Đạt mốc: hiệu ứng ngắn không bắt buộc, có thể đóng; không phát lại khi refresh hoặc mở trên thiết bị khác.
5. Trang chi tiết: ba hình thái, cách nhận XP và lịch sử thay đổi gần đây; không mở thành một màn chơi riêng.
6. Cài đặt: đổi tên, ẩn thẻ, giảm chuyển động. Ẩn thẻ không xóa tiến độ và vẫn ghi nhận XP khi đã tham gia; giải thích rõ.

### 6.2. Bộ asset

- [ ] Tạo một nhân vật nguyên bản với ba hình thái bằng công cụ tạo ảnh ở giai đoạn thiết kế; không tạo ảnh trong request của người dùng.
- [ ] Chuẩn hóa style sheet: bảng màu, silhouette, góc nhìn, ánh sáng, tỷ lệ khung, nền trong suốt và chi tiết nhận diện giữ xuyên suốt các giai đoạn.
- [ ] Ưu tiên ảnh tĩnh đầu tiên; không cần sprite sheet hoặc hoạt ảnh phức tạp. Không nhúng chữ vào ảnh để hỗ trợ đa ngôn ngữ.
- [ ] Lưu ảnh gốc, prompt/reference và thông tin quyền sử dụng cần thiết; kiểm tra điều khoản công cụ lúc tạo trước khi dùng thương mại.
- [ ] Xuất WebP/PNG phù hợp, nhiều kích thước nếu cần; mục tiêu mỗi ảnh hiển thị nhỏ ≤ 150 KB, kiểm tra thực tế thay vì giảm chất lượng mù quáng.
- [ ] Chỉ tải ảnh hiện tại trên Dashboard, lazy-load hình thái khác; cache theo content hash và có ảnh dự phòng nếu tải lỗi.
- [ ] Kiểm tra nền sáng/tối, điện thoại 360px, zoom, alt text, label thanh tiến độ và `prefers-reduced-motion`.

Không mua hoặc tạo cả bộ nhân vật trước khi một nhân vật thử nghiệm đạt trải nghiệm mong muốn. Nhiều nhân vật về sau dùng chung XP profile; đổi nhân vật không chuyển điểm bằng thao tác thủ công, không reset hoặc nhân đôi XP.

## 7. Thiết kế kỹ thuật đề xuất

Giữ Java/Spring Boot + PostgreSQL + React. Tạo module `companion` dùng service nghiệp vụ đã sửa ở Phase 1. Tên dưới đây là dự kiến, chưa tồn tại trong code.

- `companion_definition`: danh mục nhân vật, mã asset, phiên bản và cấu hình hình thái; có thể bắt đầu bằng catalog tĩnh versioned.
- `user_companion`: user duy nhất, nhân vật, tên hiển thị, thời điểm tham gia, tổng XP, tùy chọn hiển thị và version khóa lạc quan.
- `companion_xp_ledger`: source ID/ngày nghiệp vụ, revision sự kiện, delta, snapshot điểm, lý do adjustment, version công thức; unique key chống xử lý cùng event hai lần.
- `companion_milestone_ack`: mốc/phiên bản đã thông báo để tránh lặp hiệu ứng xuyên phiên và thiết bị.

Nếu Phase 1 đã có ledger sự kiện chung, tái sử dụng thay vì tạo thêm hai nguồn sự thật. Projection XP phải đối soát/tái dựng được từ sự kiện đã xác minh, không từ tổng XP tài khoản có thể tiêu.

Luồng: check-in hợp lệ → sự kiện/chuyển trạng thái có version → ghi ledger và cập nhật tổng XP nguyên tử → xác định hình thái → trả tiến độ cho UI. Nếu xử lý bất đồng bộ, dùng transactional outbox và consumer idempotent; không cần message broker riêng cho 100 user khi transaction đồng bộ đã đáp ứng.

API đề xuất: `GET /api/companion`, `POST /api/companion/adopt`, `PATCH /api/companion/preferences`, `GET /api/companion/history`, `POST /api/companion/milestones/{id}/ack`. Không có endpoint client tự cộng XP hoặc chọn hình thái chưa đạt.

- [ ] Mọi API lấy user từ phiên, kiểm tra ownership, giới hạn tên và phân trang lịch sử.
- [ ] Tạo hồ sơ đồng thời chỉ có một bản ghi; hai check-in khác nhau không mất cập nhật XP.
- [ ] Feature flag tách phần hiển thị với ghi nhận tiến độ. Khi tắt UI do lỗi ảnh, không làm mất event; khi tắt xử lý XP phải có cơ chế lưu/replay nguồn để bù lại.
- [ ] Migration mới sau các phase trước, không sửa V1 hoặc giả định số migration kế tiếp. Rollback UI vẫn giữ ledger/progress an toàn.

## 8. Người dùng cũ và quyền riêng tư

- [ ] MVP bắt đầu tích lũy từ thời điểm chọn tham gia, không hồi tố toàn bộ XP tài khoản có thể từng bị lỗi hoặc bị tiêu; giải thích trước khi nhận bạn đồng hành.
- [ ] Nếu muốn tặng tiến độ cho user cũ, triển khai migration riêng từ lịch sử đã xác minh và chống backfill trùng, không cộng tùy ý vào runtime.
- [ ] Không đọc nhật ký, mood hoặc dữ liệu thanh toán để vận hành thú cưng; không gửi dữ liệu sang AI cho chức năng này.
- [ ] Xóa tài khoản xóa dữ liệu bạn đồng hành theo chính sách chung; export bao gồm tiến độ và lịch sử phù hợp.
- [ ] Chỉ thu sự kiện tối thiểu: bật/ẩn tính năng, xem mốc và hành vi check-in tổng hợp; không thu tên thú cưng vào analytics nếu không cần.

## 9. Chi phí và Premium

Chi phí chính: thiết kế/chọn ảnh một lần, phát triển/kiểm thử, lưu trữ và băng thông asset. Không thêm chi phí model cho mỗi check-in. Chưa ước tính số tiền cụ thể trước khi chọn công cụ và đo kích thước asset.

- [ ] Bạn đồng hành cơ bản, tiến độ và hình thái cốt lõi dùng được ở Free.
- [ ] Nếu có cosmetic Premium: chỉ thay ngoại hình, không tăng XP, không bán cứu thú hoặc gây áp lực sau thất bại.
- [ ] Chưa bán cosmetic ở MVP. Trước khi bán phải định nghĩa quyền khi hết hạn/hoàn tiền và quy tắc billing của nền tảng; không xóa tiến độ khi mất Premium.
- [ ] Đo byte tải và số ledger record theo lượt check-in; không lưu asset lặp trong database từng user.

## 10. Kiểm thử và cổng phát hành

| Nhóm | Trường hợp bắt buộc |
|---|---|
| Tính đúng | Mỗi độ khó, mốc XP, sửa độ khó tương lai, hình thái cuối và không bị trừ khi tiêu thưởng |
| Chuyển trạng thái | Hoàn thành → hoàn thành; hoàn thành → bỏ qua → hoàn thành; xóa/sửa lượt; check-in bù |
| Đồng thời | Retry 10 lần, hai check-in cùng lúc, adopt hai lần, event phát lại sau timeout |
| Lịch sử | Tắt habit, qua ngày/timezone, đổi bảng điểm, user cũ tham gia, đối soát/replay |
| Bảo mật | ID user khác, tự gửi XP/tier/hình thái, tên có HTML, API không đăng nhập |
| UI | Việt/Anh, desktop/mobile, light/dark, giảm chuyển động, ảnh lỗi, mạng chậm, reload mốc |
| Phục hồi | Deploy/restart, rollback UI, tắt feature flag, replay không tăng XP lần hai |

Cổng nghiệm thu trước beta: không tác động sai XP tài khoản cũ; không cộng XP lặp; mọi chỉnh sửa nguồn đối soát được; không tạo hành vi phạt thú; core check-in dùng được khi phần ảnh/tính năng phụ gặp lỗi.

## 11. Beta và đánh giá giá trị

1. Dùng nội bộ một nhân vật; kiểm tra nhịp lên hình thái bằng dữ liệu mô phỏng nhiều tần suất.
2. Mời 5–10 người chủ động bật trong 2 tuần; hỏi họ hiểu cách nhận XP và có thấy thêm gánh nặng không.
3. Mở khoảng 30 người trong 2–4 tuần; ghi tỷ lệ tắt tính năng, quay lại ngày 7, hoàn thành thói quen đã có và tạo habit trùng sau khi bật.
4. Chỉ mở cho khoảng 100 người hoặc tạo thêm nhân vật khi có tín hiệu hữu ích và không làm app khó dùng hơn.

Điều kiện quyết định đề xuất: không P0/P1 liên quan dữ liệu; ít nhất 80% người được phỏng vấn hiểu XP đến từ việc thật mà không cần giải thích; phần lớn phản hồi thấy hữu ích hoặc trung tính, không lặp lại phàn nàn về áp lực chăm thú. Cần đọc phản hồi cụ thể, không chỉ chạy theo một tỷ lệ.

So sánh nhóm bật/tắt chỉ là tín hiệu vì người dùng tự chọn; không kết luận thú cưng gây tăng retention từ mẫu nhỏ. Nếu người dùng chủ yếu tạo việc giả hoặc thấy áp lực, giảm mức nổi bật/sửa quy tắc trước khi mở rộng.

## 12. Lộ trình và trạng thái

| Đợt | Đầu ra | Ước lượng sơ bộ | Trạng thái |
|---|---|---|---|
| 3A | Chốt XP, sửa check-in, mốc hình thái, wireframe và một bộ ảnh | 3–5 ngày | Chưa bắt đầu |
| 3B | Migration, ledger/projection, API, quyền và test PostgreSQL | 4–7 ngày | Chưa bắt đầu |
| 3C | Dashboard/chi tiết/cài đặt, i18n, asset và accessibility | 3–5 ngày | Chưa bắt đầu |
| 3D | Kiểm thử tích hợp, đối soát, thiết bị thật và sửa lỗi | 3–5 ngày | Chưa bắt đầu |
| 3E | Beta, đo phản hồi và quyết định mở rộng | 2–4 tuần quan sát | Chưa bắt đầu |

Ước lượng cho một người hiểu code khi nền tảng đã ổn định; thời gian sửa ledger/lịch nguồn còn thiếu phải tính thêm. Chưa cam kết ngày phát hành hoặc kết quả giữ chân người dùng.

Bàn giao: bộ ảnh gốc/tối ưu, quy tắc điểm và mốc có version, migration/API/UI, kết quả test, công cụ đối soát, feature flag, báo cáo beta và quyết định có thêm nhân vật hay không.
