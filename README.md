# Sentence Quest — Gói triển khai Vercel + Neon + GitHub

Game luyện viết lại câu tiếng Anh: 80 chặng C01–C80, 12 nhóm, Vùng Boss
C51–C80, kho thật 1489 câu trong `public/game-data.json` (giữ nguyên nội
dung, không sửa). Học sinh đăng ký tài khoản, chơi trên mọi máy, tiến trình
lưu trên cơ sở dữ liệu Neon Postgres. **Toàn bộ dùng gói miễn phí.**

```
Repo GitHub (code này)
   ├── public/            # Frontend tĩnh: index.html, app.js, style.css, game-data.json
   ├── api/               # Backend: Vercel Serverless Functions (Node.js)
   │   ├── _lib/db.js     # Driver HTTP của Neon + JWT auth
   │   ├── auth/          # register / login / me
   │   ├── progress.js    # GET/PUT tiến trình
   │   ├── attempts.js    # Ghi lượt chơi
   │   ├── leaderboard.js # Bảng tuần (reset thứ Hai)
   │   ├── reports.js     # Học sinh báo đáp án khác
   │   ├── teacher/       # students / class-errors / reports (chỉ giáo viên)
   │   └── rooms/         # Phòng tiếp sức (tạo / join / trả lời / tổng kết)
   ├── schema.sql         # Tạo bảng trên Neon (chạy 1 lần)
   ├── vercel.json        # Map đường dẫn gốc sang file trong public/
   ├── package.json       # 3 dependency thuần JS: @neondatabase/serverless, bcryptjs, jsonwebtoken
   └── .env.example       # Mẫu biến môi trường
```

## Bước 1 — Đưa code lên GitHub

```bash
cd sentence-quest-server
git init
git add .
git commit -m "Sentence Quest: Vercel + Neon"
# Tạo repo trống trên github.com (KHÔNG tick "Add a README"), rồi:
git remote add origin https://github.com/<ten-cua-thay>/sentence-quest.git
git branch -M main
git push -u origin main
```

> ⚠️ **Không commit file `.env` thật.** Chỉ có `.env.example` trong repo.
> Kiểm tra lại bằng `git status` trước khi push — nếu lỡ thấy `.env`, chạy
> `git rm --cached .env` rồi commit lại.

## Bước 2 — Tạo database Neon (vùng Singapore)

1. Vào [neon.tech](https://neon.tech) → Sign up (miễn phí) → New Project.
2. **Region: chọn `Singapore (ap-southeast-1)`** — gần Việt Nam nhất, học
   sinh chơi đỡ trễ.
3. Đặt tên project VD `sentence-quest`, database mặc định `neondb`.
4. Vào project → **SQL Editor** → dán toàn bộ nội dung file `schema.sql`
   trong gói này → Run. Thấy báo thành công cho cả 5 bảng
   (`users`, `progress`, `attempts`, `reports`, `rooms`) là xong.
5. Lấy connection string: Neon Dashboard → **Connect** → chọn
   **"Pooled connection"** (Neon khuyên dùng cho serverless) → copy chuỗi
   dạng:
   `postgresql://<user>:<password>@<host>.ap-southeast-1.aws.neon.tech/<dbname>?sslmode=require`
   Đây chính là `DATABASE_URL`.

## Bước 3 — Import repo vào Vercel

1. Vào [vercel.com](https://vercel.com) → Sign up bằng tài khoản GitHub
   (để Vercel đọc được repo) → **Add New → Project** → chọn repo
   `sentence-quest` → **Import**.
2. Framework Preset: để **Other** (không chọn gì cả). Root Directory: để
   mặc định. Build/Output: để mặc định — Vercel tự nhận `api/` thành
   Serverless Functions và `vercel.json` map frontend.
3. **Environment Variables** — thêm đủ 3 biến (môi trường Production):
   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Chuỗi connection Neon lấy ở bước 2 |
   | `JWT_SECRET` | Một chuỗi dài ngẫu nhiên do thầy tự đặt (VD 32 ký tự trở lên) — **đừng dùng chuỗi mẫu** |
   | `TEACHER_CODE` | Mã giáo viên do thầy tự đặt (VD `GV-Toan-2026`) — dùng để đăng ký tài khoản giáo viên |
4. Bấm **Deploy**. Chờ 1–2 phút → Vercel cấp địa chỉ dạng
   `https://sentence-quest.vercel.app`. Mở địa chỉ đó: trang đăng nhập phải
   hiện ra. (HTTPS đã có sẵn trên Vercel, không cần cấu hình thêm.)

## Bước 4 — Tạo tài khoản giáo viên đầu tiên

1. Mở trang web → **Đăng ký**.
2. Điền tên đăng nhập, họ tên, mật khẩu, và ô **"Mã giáo viên" = đúng
   `TEACHER_CODE` đã đặt ở bước 3**.
3. Đăng nhập bằng tài khoản đó → tab **Giáo viên** hiện ra: xem học sinh,
   tiến trình từng em, top 3 lỗi cả lớp, báo cáo đáp án khác.
4. Học sinh đăng ký bình thường (không nhập mã giáo viên), chọn đúng lớp.

## Bước 5 — Cập nhật sau này

Sửa code → `git push` lên GitHub → Vercel tự deploy lại trong 1–2 phút.
Đổi `TEACHER_CODE` hay `JWT_SECRET`: sửa trong Vercel Dashboard →
Settings → Environment Variables → **Redeploy** (Deployments → ⋯ →
Redeploy) để nhận biến mới. Đổi `JWT_SECRET` sẽ làm mọi phiên đăng nhập cũ
hết hạn — mọi người đăng nhập lại.

## Chạy thử trên máy của thầy (tùy chọn)

```bash
npm install
cp .env.example .env   # điền DATABASE_URL thật (Neon), JWT_SECRET, TEACHER_CODE
npx vercel dev         # cần Vercel CLI chính thức + đăng nhập Vercel
```

Mở http://localhost:3000 để thử. (Nếu chỉ muốn xem giao diện mà chưa có
Neon, mở thẳng file `public/index.html` sẽ thấy trang nhưng đăng nhập sẽ
báo lỗi — vì chưa có database.)

## Sao lưu dữ liệu

Neon Dashboard → chọn database → **Backups / Branches**: gói miễn phí có
Point-in-Time Recovery trong 1 ngày gần nhất; muốn giữ lâu hơn thì tự xuất
định kỳ bằng `pg_dump` (cần cài PostgreSQL client):

```bash
pg_dump "<DATABASE_URL>" > backup-$(date +%F).sql
```

## Giới hạn của gói miễn phí (nói rõ trước)

- **Vercel Hobby:** đủ cho một trường/lớp dùng bình thường. Function chạy
  tối đa 10 giây/lượt gọi — các API trong gói này đều là 1–2 câu SQL nên
  thoải mái trong giới hạn đó.
- **Neon Free:** compute tự ngủ sau 5 phút không dùng (lần truy cập đầu
  sau khi ngủ sẽ chậm 1–3 giây rồi chạy bình thường), dung lượng ~0.25 GB —
  đủ cho vài trăm học sinh chơi cả năm (mỗi lượt chơi chỉ là 1 dòng nhỏ).
  Hết dung lượng miễn phí thì Neon khóa ghi — khi đó nâng cấp hoặc dọn bớt
  bảng `attempts` cũ.
- **Bảo mật:** mật khẩu hash bằng bcrypt (không lưu plaintext), JWT hạn
  30 ngày. Chưa có giới hạn số lần đăng nhập sai, chưa có xác thực email —
  phù hợp dùng trong nội bộ trường, không nên công bố rộng rãi cho người lạ.
- **Giải thích đáp án** trong dữ liệu gốc viết không dấu tiếng Việt, game
  hiển thị đúng như dữ liệu gốc, không tự thêm dấu.
- **Mất mạng khi chơi:** tiến trình lưu tạm trong trình duyệt và tự đồng bộ
  lại khi có mạng. Lượt chơi gửi thất bại khi mất mạng sẽ không tự gửi lại —
  sao và XP vẫn đồng bộ qua tiến trình, chỉ điểm bảng tuần của lượt đó có
  thể thiếu.
- **Phòng tiếp sức:** học sinh vào phòng bằng PIN + tên (không bắt buộc
  đăng nhập), trang phòng tự làm mới mỗi 3 giây — không phải thời gian thực
  từng mili-giây.

## API (để đối chiếu khi cần)

`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`,
`GET/PUT /api/progress`, `POST /api/attempts`, `GET /api/leaderboard`,
`POST /api/reports`, `GET /api/teacher/students`,
`GET /api/teacher/class-errors`, `GET /api/teacher/reports`,
`POST /api/rooms`, `POST /api/rooms/join`, `GET /api/rooms/:id`,
`POST /api/rooms/:id/answer`, `GET /api/rooms/:id/summary`.
