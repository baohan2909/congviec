# CÔNG VIỆC — v0.1.0

Hệ thống báo cáo & quản trị công việc cho Ban Quản trị Nón Sơn.
PWA thuần (không cần build) · GitHub Pages · Supabase Pro Sydney · Claude API.

```
congviec/
├── index.html · manifest.webmanifest · sw.js
├── css/app.css                 ← design system (sáng mặc định, tối tùy chọn)
├── icons/                      ← icon PWA
├── js/
│   ├── 00-config.js            ← ⚠️ ĐIỀN SUPA_URL + SUPA_ANON tại đây
│   ├── 01-supabase.js          ← client, RPC, nén ảnh WebP, upload
│   ├── 02-auth.js              ← đăng nhập, buộc đổi mật khẩu lần đầu
│   ├── 03-ui.js                ← icon SVG stroke, toast, sheet, format
│   ├── 04-voice.js             ← ghi âm liền mạch (Tạm dừng / Gửi ngay)
│   ├── 05-troly.js             ← trợ lý agentic: AI soạn → người duyệt → RPC ghi
│   ├── 10..14-tab-*.js         ← Hôm nay · Báo cáo · Kế hoạch · Tài khoản · Quản trị
│   └── 99-app.js               ← khởi động, tabbar, theme
└── supabase/
    ├── 01_schema.sql           ← 14 bảng + RLS deny-all
    ├── 02_functions.sql        ← 20 RPC SECURITY DEFINER (đã smoke test 11/11)
    ├── 03_seed_cron.sql        ← seed + 3 cron nhắc việc (pg_cron)
    ├── 04_storage.sql          ← bucket bao-cao + policy
    └── functions/ai-gateway/index.ts  ← Edge Function proxy Claude
```

---

## TRIỂN KHAI (làm 1 lần, ~20 phút)

**Bước 1 — Tạo Supabase project**
Dashboard → New project → gói trả phí → **Region: Sydney (ap-southeast-2)** ⚠️ region không đổi được sau khi tạo.

**Bước 2 — Chạy SQL**
SQL Editor → chạy lần lượt: `01_schema.sql` → `02_functions.sql` → `03_seed_cron.sql` → `04_storage.sql`.
Nếu 03 báo thiếu pg_cron: Database → Extensions → bật **pg_cron** rồi chạy lại.

**Bước 3 — Edge Function ai-gateway**
Edge Functions → Deploy new function → tên `ai-gateway` → dán nội dung `functions/ai-gateway/index.ts` → Deploy.
Sau đó vào **Secrets** thêm: `ANTHROPIC_API_KEY = sk-ant-...` (key Claude của anh).
Giữ nguyên "Verify JWT" bật (app gửi anon key hợp lệ).

**Bước 4 — Cấu hình frontend**
Mở `js/00-config.js`, điền `SUPA_URL` và `SUPA_ANON`
(lấy tại Settings → API → Project URL + anon public key).

**Bước 5 — Deploy GitHub Pages**
Tạo repo `baohan2909/congviec` → đẩy toàn bộ thư mục (trừ `supabase/`, để lại cũng không sao) →
Settings → Pages → Branch main → app chạy tại `https://baohan2909.github.io/congviec/`.

**Bước 6 — Đăng nhập đầu tiên**
Tài khoản: `NS00490` · Mật khẩu tạm: `Congviec@2026` → hệ thống buộc đổi ngay.
Vào tab **Quản trị → Nhân sự** tạo tài khoản cho BGĐ/BQL (nhớ điền "Tên gọi" — trợ lý xưng hô theo đó).

---

## ⚠️ QUY TẮC VERSION BUMP — đổi đồng bộ 3 nơi

1. `SYS.version` trong `js/00-config.js`
2. `CACHE_VERSION` trong `sw.js`
3. `app_settings.cache_version` (SQL: `update app_settings set gia_tri='x.y.z' where khoa='cache_version';`)

Đổi model AI không cần sửa code:
`update app_settings set gia_tri='claude-sonnet-4-6' where khoa='model_troly';`

---

## TRẠNG THÁI PHASE 1 (bản v0.1.0 này)

| Hạng mục | Trạng thái |
|---|---|
| Đăng nhập mã NV + mật khẩu, buộc đổi lần đầu, phiên 30 ngày | ✅ |
| Check-in 4 trạng thái (2 chạm) + bắt buộc địa điểm khi công tác | ✅ |
| Timeline di chuyển trong ngày | ✅ |
| Ghi âm liền mạch kiểu ChatGPT (Tạm dừng → sửa/nói tiếp · Gửi ngay) | ✅ |
| Lưu file ghi âm gốc kèm báo cáo | ✅ |
| Trợ lý cá nhân theo tên, agentic 6 công cụ, bản xem trước → Xác nhận | ✅ |
| Báo cáo ngày: nói/gõ + AI chuẩn hóa 3 mục + cờ vấn đề + ảnh nén WebP (≤10) | ✅ |
| Kế hoạch: tạo bằng giọng nói hoặc form, nhắc trước X phút | ✅ |
| Nhắc tự động: check-in 9:00 · báo cáo 17:00 · kế hoạch đến giờ · quá hạn | ✅ (hiện trong app khi mở) |
| Admin: tạo/sửa/khóa tài khoản, reset mật khẩu, phòng ban | ✅ |
| Dashboard BQT: nhân sự hôm nay, ai chưa cập nhật, báo cáo + vấn đề nổi đầu | ✅ |
| Lưu song song bản nói gốc ↔ bản AI chỉnh (kiểm chứng AI) | ✅ |
| Nhật ký trợ lý + đếm token theo người (đánh giá Haiku vs Sonnet) | ✅ |
| Web Push (nhắc khi app đóng) | ⚠️ Patch 2 — hiện nhắc hiển thị khi mở app |
| Đăng nhập khuôn mặt | ⚠️ Patch 2 — cần tái dụng module từ chamcong |
| STT server dự phòng (máy không có Web Speech) | ⚠️ Patch 2 — hiện fallback gõ tay |
| Realtime dashboard tự cập nhật | ⚠️ Patch 2 |
| Giao việc / hạng mục / deadline (bảng đã sẵn) | ❌ Phase 2 theo lộ trình |
| Tóm tắt AI cuối ngày cho BQT | ❌ Phase 2 |

## LỘ TRÌNH PATCH KẾ TIẾP

- **Patch 2 (v0.2):** Web Push (VAPID + Edge push-sender), đăng nhập khuôn mặt, Realtime tab Quản trị, STT dự phòng.
- **Patch 3 (v0.3):** Giao việc + deadline + tiến độ, tóm tắt AI cuối ngày 18:30 đẩy cho BQT.

# Patch 01 → v0.1.1

**Sửa lỗi:** iPhone Safari không cho gõ ô Mật khẩu ở màn đăng nhập.

## Cách cập nhật (2 phút)

1. **Giải nén file zip này** → đè thẳng vào thư mục repo `congviec` trên máy anh.
   Cấu trúc trong zip đã đúng vị trí, không cần copy tay từng file.

2. **Push lên GitHub Pages** như thường lệ.

3. **Chạy 1 dòng SQL** trong Supabase SQL Editor (nội dung file `BUMP_v0.1.1.sql`):
   ```sql
   update app_settings set gia_tri = '0.1.1', cap_nhat_luc = now()
   where khoa = 'cache_version';
   ```

4. **Trên iPhone:** tắt hẳn app (vuốt tắt trong app switcher) → mở lại. Service worker sẽ tự nạp bản mới.

## File đã thay đổi

| File | Sửa gì |
|---|---|
| `js/00-config.js` | Bump `SYS.version` = `0.1.1` |
| `js/02-auth.js` | Bọc form đúng chuẩn iOS, thêm nút con mắt hiện/ẩn mật khẩu |
| `css/app.css` | Style cho nút con mắt |
| `sw.js` | Bump `CACHE_VERSION` = `congviec-0.1.1` (kích hoạt cập nhật) |
| `BUMP_v0.1.1.sql` | Đồng bộ `app_settings.cache_version` |
