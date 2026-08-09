# SelfForge

Backend Java/Spring Boot cho ứng dụng kỷ luật bản thân. Project hiện có REST API và giao diện web tĩnh chạy trực tiếp cùng Spring Boot.

## Chức năng

### Core
- Đăng ký/đăng nhập bằng token phiên.
- Tách dữ liệu theo từng user.

### Thói quen
- Tạo, sửa, tắt thói quen.
- Phân loại theo danh mục: Sức khỏe, Học tập, Công việc, Tinh thần, Tài chính, Xã hội.
- Tag tùy chỉnh.

### Check-in
- Check-in hằng ngày: hoàn thành, bỏ qua, thất bại.
- Điểm kỷ luật: hoàn thành cộng điểm, thất bại trừ một phần điểm.
- Streak: chuỗi ngày hoàn thành liên tiếp.

### Dashboard
- Điểm trong ngày, điểm trong tuần, tỷ lệ hoàn thành.
- Tiến độ từng thói quen hôm nay.

### Nhật ký
- Nhật ký cuối ngày: điều thắng được, trở ngại, bài học, trọng tâm ngày mai.

### Thử thách
- Thử thách 7/21/30/60/90 ngày gắn với thói quen.
- Tính tiến độ tự động từ check-in.

### Thống kê, thưởng và phạt
- Thống kê tuần, tháng và heatmap cả năm.
- XP, cấp độ, huy hiệu.
- Lịch sử phạt khi mất streak hoặc check-in thất bại.

## Chạy ứng dụng

```powershell
mvn spring-boot:run
```

Giao diện web:

```text
http://localhost:8080/
```

API:

```text
http://localhost:8080/api
```

H2 Console:

```text
http://localhost:8080/h2-console
```

Thông tin database:

```text
JDBC URL: jdbc:h2:file:./data/discipline-db
User: sa
Password: để trống
```

## Tài khoản mẫu

```text
Email: demo@selfforge.local
Password: password123
```

## API chính

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập |
| GET | /api/auth/me | Thông tin user |
| GET | /api/habits | Danh sách thói quen |
| POST | /api/habits | Tạo thói quen |
| POST | /api/check-ins | Check-in |
| GET | /api/dashboard/today | Dashboard hôm nay |
| POST | /api/journal | Lưu nhật ký |
| GET | /api/challenges | Danh sách thử thách |
| POST | /api/challenges | Tạo thử thách |
| GET | /api/challenges/{id}/progress | Tiến độ thử thách |
| GET | /api/stats/weekly | Thống kê tuần |
| GET | /api/stats/monthly | Thống kê tháng |
| GET | /api/rewards/progress | Cấp độ và XP |
| GET | /api/rewards/achievements | Danh sách huy hiệu |
| GET | /api/categories | Danh sách danh mục |

## Kiểm thử

```powershell
mvn compile
mvn -Pwith-tests test
```
