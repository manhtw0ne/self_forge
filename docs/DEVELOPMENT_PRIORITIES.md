# SelfForge — Ưu tiên phát triển hiện hành

Cập nhật: 2026-11-02, theo quyết định của chủ dự án. Tài liệu này thay thế thứ tự ưu tiên AI trong các kế hoạch trước; kết quả kiểm chứng lịch sử vẫn được giữ trong TASK_PROGRESS.md.

## 1. Hoàn thiện phần cốt lõi trước

Mục tiêu: người dùng tạo được thói quen phù hợp, ghi nhận việc đã làm và quay lại dùng app mà dữ liệu và trải nghiệm đáng tin cậy.

Thứ tự thực hiện:

1. History API V43 đã được nối vào phần lịch sử chỉ đọc của HabitsPage cho habit đang bật/tạm dừng, với loading, lỗi, phân trang và Việt/Anh; frontend tests/lint/build đã qua ngày 2026-11-02. Kiểm thử tương tác trình duyệt/mobile vẫn nằm trong đợt nghiệm thu luồng sử dụng bên dưới.
2. Chốt và triển khai phần nghiệp vụ còn thiếu của lịch target/pause, timezone và check-in bù/legacy. Giữ snapshot của check-in đã ghi, không suy diễn ngày lịch sử chưa biết; xác nhận streak, XP/phạt và Pomodoro đúng qua retry và thao tác đồng thời.
3. Hoàn thiện luồng sử dụng hiện có: onboarding → tạo habit → check-in đầu tiên → xem tiến độ → quay lại sau khi bỏ lỡ. Rà soát goals, journal, reminders và Pomodoro hiện có về lỗi, mất mạng, thao tác lặp, mobile và khả năng tiếp cận; tránh mở rộng thêm module để làm đẹp danh sách tính năng.
4. Hoàn tất kiểm chứng tài khoản, export/xóa dữ liệu, email thật khi có credentials, CI, migration, staging và backup/restore. Chỉ thu tiền khi thanh toán/entitlement được nghiệm thu riêng.
5. Beta nhỏ để tìm vấn đề sử dụng thực tế. Ghi nhận activation (tạo habit và check-in đầu tiên), quay lại sau 7 ngày/tuần kế tiếp, các hành động hoàn thành và phản hồi; không đưa nội dung nhật ký vào analytics.

Mỗi lần chạy đọc trạng thái hiện tại, tiếp tục việc chưa xong có ưu tiên cao nhất và kiểm chứng increment đó. Thiếu credentials cho một tích hợp phải ghi rõ blocker, không bật provider hoặc đánh dấu tích hợp thật đã đạt bằng mock tests.

## 2. Chỉ thử nghiệm AI tổng kết tuần

AI-2A là thử nghiệm AI duy nhất được phép phát triển trong phạm vi hiện hành, sau khi các điều kiện lõi và dữ liệu đầu vào của luồng này đã đạt. Lõi app tiếp tục hoạt động khi AI tắt, hết quota hoặc provider lỗi.

- Giả thuyết: tổng kết từ dữ liệu tuần giúp người dùng chọn và thực hiện một điều chỉnh hữu ích cho tuần tiếp theo.
- Chỉ tạo khi người dùng chủ động yêu cầu và đồng ý với phạm vi dữ liệu gửi đi; beta đầu dùng số liệu có cấu trúc, không gửi nội dung nhật ký. Số liệu và quyền sở hữu do backend quyết định.
- Đầu ra ngắn, có căn cứ và tối đa 1–3 đề xuất để người dùng duyệt. Không tự sửa habit, lịch, streak, XP hoặc dữ liệu khác.
- Tận dụng code weekly hiện có, kết quả đã lưu, quota và feature flag. Không xây lại adapter hoặc mở rộng hạ tầng AI nếu luồng tổng kết tuần chưa cần.
- Trước khi gọi provider trả phí: xác định ngân sách, quota và giới hạn token; ghi nhận chi phí thực tế, lỗi, retry và thời gian phản hồi. Cấu hình provider/credentials là bước riêng; sửa kế hoạch không tự bật AI.
- So sánh với bản tổng kết thống kê/mẫu dùng cùng dữ liệu. Đo tỷ lệ xem, chấp nhận/sửa đề xuất, hành động thực hiện sau đó, quay lại tuần sau, chi phí mỗi kết quả hữu ích và chuyển đổi trả phí khi đã đủ điều kiện bán.
- Beta ít người dùng giúp đánh giá tính dễ dùng và chất lượng; không dùng một nhóm nhỏ tự chọn để kết luận tác động nhân quả lên retention hoặc doanh thu. Khi đủ dữ liệu, đặt trước tiêu chí thành công và thực hiện so sánh có kiểm soát.
- Quyết định tiếp tục/dừng dựa trên hành động hữu ích và lợi ích kinh doanh tăng thêm so với tổng chi phí API, phát triển, kiểm thử, hỗ trợ và bảo trì. Chưa chốt các ngưỡng số hoặc giả định ROI là dương khi chưa có baseline và dữ liệu thực đo.

## 3. Tạm dừng mở rộng các luồng AI khác

| Luồng | Trạng thái hiện hành |
|---|---|
| AI lập kế hoạch mục tiêu (GOAL / AI-2B) | Tạm dừng mở rộng |
| AI bắt đầu lại (RESTART / AI-2C) | Tạm dừng mở rộng |
| AI phản hồi nhật ký (JOURNAL) | Tạm dừng mở rộng |
| AI kế hoạch ngày (DAILY_FOCUS) | Tạm dừng mở rộng |
| Chat Coach (CHAT) | Tạm dừng mở rộng |

Giữ code và dữ liệu đã có; cho phép sửa lỗi bảo mật, quyền riêng tư, mất dữ liệu hoặc tương thích ảnh hưởng phần cốt lõi. Không thêm tính năng, provider, model, quota, gói bán hàng hoặc tự đưa các luồng này vào các đợt tiếp theo. Các chức năng goals, restart bằng mẫu, nhật ký, kế hoạch ngày không dùng AI vẫn thuộc phần cốt lõi được hoàn thiện.

Chỉ mở lại phạm vi AI khác khi chủ dự án có quyết định mới. Kết quả beta tổng kết tuần là đầu vào cho quyết định đó, không tự động cho phép mở rộng.

## 4. Điều kiện ghi nhận hoàn tất

Phân biệt rõ: code đã viết, tests đã qua, tích hợp thật đã kiểm chứng và beta đã cho kết quả. Không coi toàn bộ app hoàn tất chỉ vì có nhiều tính năng hoặc tests xanh. Các kế hoạch AI cũ được giữ làm tài liệu tham khảo cho phần đã tạm dừng.
