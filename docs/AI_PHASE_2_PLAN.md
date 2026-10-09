# SelfForge — Giai đoạn sản phẩm 2: AI hỗ trợ duy trì thói quen

Ngày lập: 22/09/2026. Trạng thái: chưa triển khai. Kế hoạch cha: [PUBLIC_PRODUCT_UPGRADE_PLAN.md](PUBLIC_PRODUCT_UPGRADE_PLAN.md), mục 16.

## 1. Mục tiêu và kết quả nghiên cứu

AI giúp người dùng hiểu tiến độ, chọn điều chỉnh nhỏ và quay lại sau khi bỏ lỡ. Thành công được đánh giá bằng lời khuyên có căn cứ và hành động hữu ích, không bằng số tin nhắn hay độ dài hội thoại.

- Tổng quan nghiên cứu về Self-Determination Theory trong công nghệ thay đổi hành vi nhấn mạnh vai trò của quyền tự quyết và năng lực. Áp dụng vào SelfForge: đưa lựa chọn có thể sửa/từ chối, tránh lời trách móc hoặc gây áp lực giữ streak. Đây là định hướng thiết kế, không phải bằng chứng AI SelfForge sẽ làm tăng retention. [Nghiên cứu tổng quan](https://arxiv.org/abs/2402.00121).
- NIST xác định các rủi ro như thông tin bịa và quyền riêng tư của AI sinh nội dung. Áp dụng: số liệu lấy từ backend, nhận xét phải có căn cứ, giới hạn dữ liệu gửi và kiểm chứng đầu ra. [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf).
- OWASP mô tả prompt injection và quyền hành động quá mức. Áp dụng: nhật ký/tên habit là dữ liệu không đáng tin, model không có quyền ghi DB; mọi thay đổi đi qua xác thực, validation và sự đồng ý của người dùng. [Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).

Kế hoạch 3 ngày là giả thuyết sản phẩm cần thử nghiệm, không phải liệu trình hay khoảng thời gian đã được chứng minh để hình thành lại thói quen. Chưa chốt hãng/model AI; so sánh chất lượng Việt/Anh, chính sách dữ liệu, latency và chi phí trước khi chọn.

## 2. Điều kiện bắt đầu

- [ ] Sửa lỗi XP/phạt lặp, timezone và phân quyền ở giai đoạn 1; số liệu đầu vào đã đáng tin.
- [ ] Có dữ liệu lịch thực hiện để phân biệt không đến lịch, bỏ lỡ, bỏ qua và thất bại. Nếu chưa có lịch sử phiên bản lịch, không suy diễn mẫu số từ lịch hiện tại.
- [ ] Có cơ chế consent, xóa dữ liệu, quota, theo dõi chi phí và tắt AI từ cấu hình server.
- [ ] Lõi app hoạt động độc lập khi AI tắt hoặc provider lỗi; tích hợp vào i18n Việt/Anh hiện có.
- [ ] Chỉ bán quyền AI sau khi thanh toán/entitlement giai đoạn 1 đã nghiệm thu; có thể chạy beta miễn phí trước.

## 3. Phạm vi theo đợt

| Ưu tiên | Tính năng | Vị trí | Đợt |
|---|---|---|---|
| 1 | Tổng kết tuần: tiến độ, trở ngại có căn cứ, 1–3 điều chỉnh | Weekly Review | AI-2A |
| 2 | Mục tiêu → bước nhỏ, habit, thử thách ban đầu | Goals | AI-2B |
| 3 | Gợi ý khi mất nhịp và kế hoạch bắt đầu lại 3 ngày | Dashboard/check-in | AI-2C |
| 4 | Phản hồi nhật ký: nhận xét, câu hỏi, hành động ngày mai | Journal | Sau beta ba luồng đầu |
| 5 | Lập kế hoạch hôm nay theo thời gian/năng lượng, chia Pomodoro | Dashboard/Pomodoro | Sau beta ba luồng đầu |
| 6 | Chat Coach hỏi đáp về tiến độ cá nhân | Trang Coach | Cuối cùng, sau khi có đánh giá và ngân sách riêng |

Không thêm chatbot tổng quát, duyệt web, vector database hay agent tự hành trong bản đầu. Các dịch vụ Java hiện tại có thể tổng hợp dữ liệu có cấu trúc đủ cho ba luồng này.

## 4. AI-2A — Tổng kết tuần

Luồng: chọn tuần → xem phạm vi dữ liệu → bấm tạo → nhận tổng kết và căn cứ → xem/sửa đề xuất → áp dụng hoặc giữ kế hoạch hiện tại.

- [ ] Backend tính số lượt theo lịch, hoàn thành, bỏ qua, thất bại, chưa check-in, Pomodoro và tiến độ goal theo timezone; thiếu check-in không đồng nghĩa xác nhận đã thất bại.
- [ ] Snapshot có khoảng ngày, phiên bản và source ID người dùng được phép xem; không gửi email, token hoặc thông tin thanh toán.
- [ ] Nhật ký mặc định không được gửi. Nếu bật, chỉ lấy các mục trong khoảng ngày đã cho phép và hiển thị phạm vi đó trước khi tạo.
- [ ] Đầu ra gồm tóm tắt ngắn, điểm tiến bộ, tối đa 3 nhận xét và 1–3 hành động tuần tới; phân biệt dữ kiện, giả thuyết và đề xuất.
- [ ] Số liệu hiển thị do backend chèn; model tham chiếu metric ID, không tự tạo số. Source ID phải nằm trong snapshot và thuộc đúng user.
- [ ] Với liên hệ từ nhật ký, dùng cách nói “có thể liên quan”, không kết luận nguyên nhân. Kiểm tra câu nhận xét có được nguồn hỗ trợ; chỉ ID hợp lệ chưa đủ chứng minh câu đúng.
- [ ] Dữ liệu quá ít: nói rõ chưa đủ để tìm mẫu lặp, đề xuất từ mục tiêu/time budget; không bịa tính cách hoặc nguyên nhân.
- [ ] Kết quả đã lưu có thể đọc lại không gọi model; tạo lại có giới hạn và ghi rõ ngày dữ liệu được cập nhật.

Ví dụ hoàn toàn giả lập: “Tuần này bạn hoàn thành 18/25 lượt theo lịch. Có 3 lượt đọc sách chưa check-in. Hai nhật ký được bạn cho phép dùng có nhắc đến mệt sau giờ làm. Có thể thử đọc 5 phút sau bữa sáng trong tuần tới.” Các con số và căn cứ chỉ xuất hiện nếu có trong dữ liệu thực tế.

Nghiệm thu: khớp thống kê server, nguồn mở đúng tài khoản/tuần, không dùng journal khi chưa bật; có nút xem đề xuất và giữ nguyên, không tự sửa habit.

## 5. AI-2B — Biến mục tiêu thành kế hoạch

- [ ] Nhận mục tiêu, hạn hoàn thành, mức hiện tại, thời gian rảnh/ngày và ngày có thể thực hiện; hỏi bổ sung tối thiểu nếu thiếu dữ liệu quyết định.
- [ ] Ví dụ “đọc 12 cuốn/năm”: hỏi đã đọc bao nhiêu, mốc thời gian và thời lượng có thể dành; không mặc định mọi sách dài như nhau hoặc tự biết tốc độ đọc.
- [ ] Đề xuất các bước nhỏ, 1–3 habit khởi đầu và một thử thách tùy chọn; thể hiện thời lượng và giả định rõ ràng.
- [ ] Preview cho phép sửa tên, lịch, thời lượng, ngày bắt đầu và bỏ từng mục; kiểm tra tổng thời gian có vượt quỹ rảnh hoặc trùng habit hiện có.
- [ ] Backend kiểm tra quota của gói, quyền tài nguyên, enum và ngày; áp dụng qua service nghiệp vụ hiện tại trong transaction có idempotency key.
- [ ] Đề xuất không tự thay goal gốc; thay đổi cần có bản xem trước và xác nhận cụ thể.

Nghiệm thu: nhấn áp dụng hai lần không tạo habit trùng; vượt quota được giải thích trước; người mới không bị gán lịch sử giả; kế hoạch không vượt thời gian đã khai mà không cảnh báo và cho chỉnh.

## 6. AI-2C — Chế độ bắt đầu lại trong 3 ngày

- [ ] Backend phát hiện mất nhịp bằng quy tắc minh bạch, ví dụ bỏ lỡ hai lượt theo lịch liên tiếp; ngưỡng là cấu hình để kiểm thử, không do model tự gán.
- [ ] Chỉ mời sử dụng nhẹ nhàng; có bỏ qua và ẩn lời mời, không gọi AI sau mọi check-in thất bại.
- [ ] Người dùng chọn lý do: quá bận, quá khó, quên, hoặc lý do khác; không suy luận bệnh lý/tâm lý từ streak.
- [ ] Ngày 1: phiên bản nhỏ nhất khả thi. Ngày 2: lặp lại ở thời điểm người dùng chọn. Ngày 3: đánh giá và chọn giữ/tăng/giảm mức độ.
- [ ] Kế hoạch là bản nháp, cần duyệt. Lưu điều chỉnh có ngày hiệu lực và ngày kết thúc; giữ lịch sử trước đó, có thể dừng sớm hoặc quay về lịch cũ.
- [ ] Không tự xóa thất bại, phục hồi streak, cấp freeze hoặc sửa XP. Check-in trong kế hoạch vẫn dùng quy tắc nghiệp vụ đã công bố.
- [ ] Không dùng giọng trách móc, “bạn lười”, hoặc hứa phục hồi thói quen chắc chắn. Thừa nhận nhu cầu nghỉ và điều chỉnh mục tiêu.

Nghiệm thu: kế hoạch giới hạn đúng 3 ngày theo timezone, chỉnh lịch tương lai không đổi thống kê quá khứ, người dùng có thể từ chối và vẫn dùng app đầy đủ.

## 7. Kiến trúc đề xuất

Giữ backend Java; thêm module `ai` gồm context builder, provider adapter, output validator, quota/cost service và proposal service. Tên bên dưới là đề xuất, chưa có trong code.

1. API xác thực user, entitlement, quota và consent.
2. Server tạo snapshot tối thiểu theo tính năng, kiểm tra quyền từng tài nguyên và lưu version/hash.
3. Tạo job với idempotency key; reserve quota/ngân sách nguyên tử trước khi gọi provider để chống request đồng thời vượt trần.
4. Provider trả dữ liệu theo schema có cấu trúc: summary, observations, evidence references và proposed actions. Schema đúng không đồng nghĩa nội dung đúng.
5. Validator kiểm tra kiểu dữ liệu, metric/source ID, giới hạn nội dung và hành động; kết quả không đạt thì không hiển thị như đề xuất đáng tin.
6. Lưu kết quả và usage thực tế; frontend nhận trạng thái pending/succeeded/failed và hiển thị bản nháp.
7. Endpoint apply kiểm tra ownership, consent hiện hành, version dữ liệu, quota nghiệp vụ và payload người dùng đã duyệt; thay đổi có transaction và audit.

API dự kiến: `POST /api/ai/weekly-reviews`, `POST /api/ai/goal-plans`, `POST /api/ai/restart-plans`, `GET /api/ai/jobs/{id}`, `POST /api/ai/proposals/{id}/apply`. Không cho client chọn userId hoặc cung cấp quyền Premium.

Dữ liệu dự kiến qua migration mới: consent theo mục đích, generation job, proposal, application record và usage ledger. Lưu provider/model/prompt/schema version, trạng thái, timestamps, token/cost và context hash. Không cần lưu nguyên prompt hoặc journal vào log.

Retry có giới hạn/backoff; phân biệt quota người dùng với chi phí provider đã phát sinh dù kết quả lỗi. Không retry vô hạn khi 429/timeout. Cache chỉ trong cùng user, feature, period, locale, consent version và snapshot hash; dữ liệu thay đổi phải hết hiệu lực phù hợp.

## 8. Quyền riêng tư và an toàn

- [ ] Consent AI riêng, giải thích dữ liệu sẽ gửi và provider; journal/mood riêng tư cần lựa chọn rõ ràng, không mặc định bật từ việc mua Premium.
- [ ] Khi tắt consent: chặn yêu cầu mới, hủy job chưa gửi và xử lý bản nháp/cache có ngữ cảnh đã thu hồi. Không hứa thu hồi được dữ liệu đã gửi nếu provider không hỗ trợ; công bố retention thực tế.
- [ ] Xóa tài khoản/dữ liệu nguồn phải xử lý bản tổng kết và bản trích dẫn liên quan; chốt thời hạn lưu kết quả trước beta, có job xóa tự động.
- [ ] Kiểm tra điều khoản lưu dữ liệu/huấn luyện/vùng xử lý của provider tại thời điểm ký dùng; không mặc định API nào cũng không lưu dữ liệu.
- [ ] Không gửi toàn bộ nhật ký hoặc mọi lịch sử chỉ để tăng ngữ cảnh; lấy đúng cửa sổ ngày và thông tin cần cho tính năng.
- [ ] Nội dung người dùng có thể chứa chỉ dẫn độc hại. Model không có secret, công cụ ghi DB hoặc quyền lấy dữ liệu user khác; escape nội dung render, không thực thi HTML từ model.
- [ ] Gợi ý sức khỏe chỉ ở mức thói quen chung; không chẩn đoán từ mood/journal, không đề xuất hành vi nguy hiểm để đạt streak. Có xử lý nội dung ngoài phạm vi và lời khuyên an toàn khi cần.
- [ ] AI không được quyết định thanh toán, quyền Premium, XP, phạt hoặc xóa dữ liệu.

## 9. Quota, ngân sách và mô hình Premium

Đề xuất thử nghiệm, chưa phải gói đã bán: tối đa 5 tổng kết tuần, 4 kế hoạch mục tiêu và 4 kế hoạch bắt đầu lại mỗi user AI/tháng; tổng kết cùng tuần trả bản đã lưu trừ khi người dùng chủ động tạo lại trong quota. Chế độ bắt đầu lại bằng mẫu cố định vẫn có thể dành cho Free.

- [ ] Chốt quyền AI riêng trong entitlement, không âm thầm thêm “AI không giới hạn” vào mọi gói Premium/trọn đời đã bán.
- [ ] Giới hạn input/output token từng tác vụ, lượt tạo/ngày và/tháng, số job đồng thời và tổng ngân sách dự án.
- [ ] Cảnh báo khi dùng 50/80/100% ngân sách; server chặn tác vụ mới khi hết mức đặt trước và cung cấp tổng kết thống kê hoặc mẫu kế hoạch không dùng AI.
- [ ] Tổng kết chỉ chạy theo yêu cầu trong beta; không tự tạo cho tất cả tài khoản mỗi tuần.

Công thức: chi phí model = tổng(input token × giá input + output token × giá output) / 1.000.000, cộng retry, các phí provider khác và hạ tầng liên quan. Giá phải lấy từ provider chính thức sau khi chọn model, không dùng một giá giả làm báo giá.

Ví dụ khối lượng để lập ngân sách: 100 user AI dùng đủ 13 lượt/tháng = 1.300 lượt; giả định trung bình 3.000 input + 800 output token/lượt thì khoảng 3,9 triệu input và 1,04 triệu output token/tháng, trước retry. Đây là giả định cần đo; 100 user app không nhất thiết là 100 user AI trả phí.

Mức trần chi tiêu và quota cuối cùng cần chủ dự án quyết định trước khi bật API trả phí. Ước tính vận hành web trước đây chưa gồm khoản này. Đo chi phí mỗi kết quả hữu ích và mỗi người trả phí để điều chỉnh giá, thay vì chỉ đếm request.

## 10. Đánh giá và tiêu chí phát hành

Tạo tối thiểu 60 tình huống giả lập có đáp án/rubric: 20 cho mỗi luồng, gồm Việt/Anh, thiếu dữ liệu, lịch không đều, timezone, ngày nghỉ, dữ liệu mâu thuẫn, journal opt-out, prompt injection, nội dung nhạy cảm và proposal hết hạn. Chạy lại khi đổi model/prompt/schema.

| Tiêu chí | Cổng nghiệm thu đề xuất |
|---|---|
| Số liệu/quyền dữ liệu | 100% trường số liệu hiển thị khớp backend; không tham chiếu dữ liệu user khác trên bộ test |
| Consent | Không gửi journal trong mọi test opt-out; thu hồi consent chặn job mới và apply không hợp lệ |
| Nhận xét có căn cứ | Ít nhất 95% nhận xét được người đánh giá xác nhận có nguồn hỗ trợ; không chấp nhận nhận xét nghiêm trọng bịa đặt |
| Thay đổi dữ liệu | 100% thay đổi cần duyệt; request apply lặp không gây tác động trùng; dữ liệu cũ khiến proposal cần làm mới |
| Hữu ích | Ít nhất 80% trường hợp được người review chấm ≥ 4/5 về cụ thể, khả thi và giọng điệu hỗ trợ |
| Chi phí và lỗi | Không vượt trần từ request đồng thời; provider lỗi vẫn dùng được habit/check-in/journal |
| Trải nghiệm | Mục tiêu p95 tạo kết quả ≤ 20 giây trong beta; timeout có thông báo/retry, không spinner vô hạn |

Đây là ngưỡng dự kiến, chưa phải kết quả; bộ test nhỏ không chứng minh an toàn tuyệt đối. Reviewer phải đọc căn cứ thực tế, không chỉ dựa vào một model khác chấm model.

Beta 5–10 người đồng ý trước, sau đó 30 rồi 100 khi đạt cổng. Đo tỷ lệ xem/chấp nhận/sửa/từ chối đề xuất, đánh giá hữu ích, quay lại check-in sau bắt đầu lại và retention ngày 7. So sánh với gợi ý mẫu không AI khi có thể; không kết luận quan hệ nhân quả từ một nhóm nhỏ tự chọn. Analytics không chứa nhật ký hoặc toàn bộ phản hồi AI.

## 11. Trình tự, thời gian và bàn giao

| Đợt | Công việc | Ước lượng sơ bộ |
|---|---|---|
| AI-2.0 | Chọn provider bằng bộ eval, consent, snapshot, schema, quota và adapter | 1–2 tuần |
| AI-2A | Tổng kết tuần, nguồn tham chiếu, UI Việt/Anh và beta nhỏ | 1–2 tuần |
| AI-2B | Tạo kế hoạch mục tiêu, preview/apply và chống tạo trùng | 1–2 tuần |
| AI-2C | Bắt đầu lại 3 ngày, lịch có hiệu lực, đánh giá sau ngày 3 | 1–2 tuần |
| AI-2D | Kiểm thử chéo, đánh giá chất lượng/chi phí và mở rộng beta | 1–2 tuần, có thể giao với beta trước |

Ước lượng cho một người hiểu dự án sau khi giai đoạn 1 ổn định; không gồm thời gian chờ người beta hoặc thay đổi lớn ở lịch habit. Nếu lịch chưa lưu phiên bản theo ngày hiệu lực, phải xử lý trước AI-2C.

Bàn giao: migrations, API/UI, bộ eval và kết quả, bảng token/cost thực đo, consent/retention, runbook lỗi provider, feature flag tắt AI và quyết định go/no-go. Chỉ mở ba luồng đầu; nhật ký phản hồi, kế hoạch hôm nay và Chat Coach cần đợt lập kế hoạch riêng dựa trên dữ liệu beta.
