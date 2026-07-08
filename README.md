# CÔNG VIỆC — v0.1.3

**Hệ thống báo cáo & quản trị công việc** cho Ban Quản trị Nón Sơn.
PWA thuần (không cần build) · GitHub Pages · Supabase Pro region Sydney · Claude API.

---

## QUY TẮC PHÁT TRIỂN (Aroma chốt)

1. **Tài liệu sống — mọi thay đổi ghi vào README này.** Các mục "Nhật ký nối tiếp" và "Trạng thái tính năng" là bản đồ hiện trạng — nhìn README là biết dự án đang ở đâu.
2. **Mỗi patch bump +0.01** phiên bản.
3. **Zip chỉ chứa file thuộc repo HTML** (frontend). Giải nén → đè lên repo → push GitHub Pages.
4. **File SQL để riêng ngoài zip** — anh mở, copy nội dung, dán thẳng vào Supabase SQL Editor cho nhanh.
5. **Phiên bản hiện ngay ở màn đăng nhập** để đối chiếu trực quan sau khi cập nhật.

## VERSION BUMP — LUÔN ĐỒNG BỘ 3 NƠI

① `SYS.version` trong `js/00-config.js`
② `CACHE_VERSION` trong `sw.js`
③ `app_settings.cache_version` trong Supabase (SQL)

Không đồng bộ → service worker không dọn cache → iPhone vẫn thấy bản cũ.

---

## CẤU TRÚC DỰ ÁN

```
congviec/                            ← REPO HTML (GitHub Pages)
├── index.html · manifest.webmanifest · sw.js
├── icons/                           icon PWA
├── css/app.css                      design system
├── js/
│   ├── 00-config.js                 ⚠️ chứa SUPA_URL + SUPA_ANON
│   ├── 01-supabase.js               RPC client, nén ảnh, upload
│   ├── 02-auth.js                   đăng nhập, đổi mật khẩu
│   ├── 03-ui.js                     icon, toast, sheet, format
│   ├── 04-voice.js                  ghi âm liền mạch (Tạm dừng/Gửi ngay)
│   ├── 05-troly.js                  trợ lý agentic
│   ├── 10..14-tab-*.js              5 tab: Hôm nay / Báo cáo / Kế hoạch / Tài khoản / Quản trị
│   └── 99-app.js                    khởi động, tabbar, theme
└── README.md

supabase/  (KHÔNG nằm trong repo HTML, giữ trên máy anh làm tham chiếu)
├── 01_schema.sql                    14 bảng + RLS
├── 02_functions.sql                 20 RPC SECURITY DEFINER
├── 03_seed_cron.sql                 seed admin + cron nhắc việc
├── 04_storage.sql                   bucket bao-cao + policy
└── functions/ai-gateway/index.ts    Edge Function proxy Claude
```

---

## TRIỂN KHAI LẦN ĐẦU (~20 phút)

1. **Tạo Supabase project** — gói trả phí, **Region: Sydney (ap-southeast-2)**.
   ⚠️ Region không đổi được sau khi tạo.
2. **Chạy SQL** trong SQL Editor theo thứ tự: `01_schema.sql` → `02_functions.sql` → `03_seed_cron.sql` → `04_storage.sql`.
   Nếu 03 báo thiếu `pg_cron`: Database → Extensions → bật **pg_cron** → chạy lại.
3. **Deploy Edge Function `ai-gateway`** — Edge Functions → Deploy a new function → tên đúng `ai-gateway` → dán nội dung `functions/ai-gateway/index.ts` → Deploy.
4. **Thêm secret Claude** — Edge Functions → Secrets → `ANTHROPIC_API_KEY` = `sk-ant-...`.
5. **Cấu hình frontend** — điền `SUPA_URL` và `SUPA_ANON` (Settings → API) vào `js/00-config.js`.
6. **Deploy repo** lên GitHub Pages.
7. **Đăng nhập lần đầu** — `NS00490` / `Congviec@2026` → hệ thống bắt đổi mật khẩu.

---

## TRẠNG THÁI TÍNH NĂNG

| Nhóm | Tính năng | Trạng thái |
|---|---|---|
| Đăng nhập | Mã NV + mật khẩu, buộc đổi lần đầu, phiên 30 ngày | ✅ v0.1.0 |
| | iPhone gõ được ô mật khẩu | ✅ v0.1.1 |
| | Nút con mắt hiện/ẩn mật khẩu | ✅ v0.1.1 |
| | Đăng nhập khuôn mặt | ❌ Patch 04 |
| Check-in | 4 trạng thái · timeline di chuyển | ✅ v0.1.0 |
| Ghi âm | Liền mạch kiểu ChatGPT (Tạm dừng/Gửi ngay) · lưu file gốc | ✅ v0.1.0 |
| Trợ lý AI | Cá nhân theo tên · 6 công cụ agentic · bản xem trước Xác nhận | ✅ v0.1.0 |
| Báo cáo | Nói/gõ · AI chuẩn hóa · cờ vấn đề · ảnh WebP nén (≤10) · lịch sử 7 ngày | ✅ v0.1.0 |
| Kế hoạch | Tạo bằng giọng nói / form · nhắc trước X phút · 14 ngày | ✅ v0.1.0 |
| Nhắc việc | Auto: check-in 9:00 · báo cáo 17:00 · kế hoạch đến giờ · quá hạn | ✅ v0.1.0 (hiện in-app) |
| | Web Push (khi app đóng) | ❌ Patch 04 |
| Admin | Tạo/sửa/khóa tài khoản · reset mật khẩu · phòng ban | ✅ v0.1.0 |
| Dashboard BQT | Nhân sự hôm nay · vấn đề nổi đầu · báo cáo toàn công ty 7 ngày | ✅ v0.1.0 |
| | Realtime tự cập nhật | ❌ Patch 04 |
| Nhật ký AI | Bản gốc ↔ bản chuẩn hóa · đếm token/người | ✅ v0.1.0 |
| Giao việc | Hạng mục · deadline · tiến độ (bảng đã sẵn, UI chưa mở) | ❌ Patch 05 |
| Tóm tắt AI | Cuối ngày 18:30 · cuối tuần · cuối tháng | ❌ Patch 05 |

---

## NHẬT KÝ NỐI TIẾP

### v0.1.3 — 08/07/2026 · Fix `crypt()` + version ở màn login

**Vấn đề:**
- Đăng nhập báo `function crypt(text, text) does not exist`.

**Nguyên nhân:**
- Supabase cài extension `pgcrypto` vào schema riêng `extensions`. Các RPC đặt `search_path = public` → không thấy hàm `crypt` / `gen_salt`.

**Đã làm:**
- Nới `search_path = public, extensions` cho 4 hàm mật khẩu: `fn_dang_nhap`, `fn_doi_mat_khau`, `fn_admin_tao_nguoi_dung`, `fn_admin_cap_nhat_nguoi_dung`.
- Thêm dòng phiên bản ở đáy card đăng nhập.
- Áp dụng 4 quy tắc mới của anh vào quy trình patch (README sống, zip chỉ frontend, SQL để ngoài, version ở màn login).

**File thay đổi (frontend):**
- `README.md` — cập nhật nhật ký, thêm mục quy tắc, cập nhật trạng thái.
- `js/00-config.js` — bump `SYS.version = 0.1.3`.
- `js/02-auth.js` — import `SYS`, hiện version ở màn login.
- `sw.js` — bump `CACHE_VERSION = congviec-0.1.3`.

**SQL cần chạy:** `FIX_v0.1.3.sql` (file kèm ngoài zip).

**Kiểm chứng:** Đã tái hiện lỗi + áp fix + đăng nhập + đổi mật khẩu + đăng nhập lại bằng mật khẩu mới trên môi trường Postgres mô phỏng Supabase (schema `extensions`) — cả 3 kịch bản pass.

---

### v0.1.2 — 08/07/2026 · Điền cấu hình Supabase

**Đã làm:**
- Điền sẵn `SUPA_URL` và `SUPA_ANON` (giá trị Aroma cung cấp) vào `js/00-config.js`.
- Hướng dẫn Aroma hoàn tất 2 bước cấu hình Supabase còn lại: deploy Edge Function `ai-gateway` + thêm secret `ANTHROPIC_API_KEY`.

**File thay đổi:** `js/00-config.js`, `sw.js`, `BUMP_v0.1.2.sql`.

---

### v0.1.1 — 08/07/2026 · Fix iPhone không gõ được mật khẩu

**Vấn đề:**
- Trên iPhone Safari, ô Mật khẩu không nhận ký tự dù đã bấm chọn.

**Nguyên nhân:**
- Ô `<input type="password">` đứng ngoài thẻ `<form>` chuẩn → Safari iOS bung lớp "Mật khẩu mạnh" đè lên input → chặn ký tự gõ tay.

**Đã làm:**
- Bọc màn đăng nhập trong `<form>` với `autocomplete="username"` + `autocomplete="current-password"` chuẩn.
- Thêm nút con mắt hiện/ẩn mật khẩu (bảo hiểm khi ô password vẫn bị iOS chặn — hiện thành text luôn nhìn được).
- Cho phép Enter/Go trên bàn phím để submit.
- Áp dụng cùng cách cho màn "Đổi mật khẩu lần đầu".

**File thay đổi:** `js/02-auth.js`, `css/app.css` (thêm `.pw-wrap` + `.pw-eye`), `sw.js`, `BUMP_v0.1.1.sql`.

---

### v0.1.0 — 08/07/2026 · Bản gốc

**Đã có:**
- Schema 14 bảng · 20 RPC · RLS deny-all · cron nhắc việc.
- Edge Function `ai-gateway` proxy Claude với 6 công cụ agentic.
- Ghi âm liền mạch kiểu ChatGPT.
- Trợ lý cá nhân theo tên · bản xem trước Xác nhận.
- 5 tab: Hôm nay · Báo cáo · Kế hoạch · Tài khoản · Quản trị.
- Design system sáng mặc định (cho người lớn tuổi) + tối tùy chọn.
- PWA cài được lên màn hình chính iPhone/Android.

**Đã kiểm chứng:** 11/11 kịch bản SQL smoke test pass (đăng nhập, buộc đổi mật khẩu, validate check-in, di chuyển, báo cáo kèm ảnh, kế hoạch, chặn phân quyền, khóa tài khoản hủy phiên, dashboard BQT, 3 cron job).

---

## LỘ TRÌNH PATCH KẾ TIẾP

**Patch 04 — v0.2.0:**
- Web Push (VAPID + Edge push-sender) — nhắc việc khi app đóng.
- Đăng nhập khuôn mặt (tái dụng module từ App Chấm công).
- Realtime tab Quản trị (dashboard tự cập nhật khi có báo cáo mới).
- STT dự phòng cho máy không có Web Speech.

**Patch 05 — v0.3.0:**
- Giao việc + hạng mục + deadline + tiến độ (bảng đã sẵn từ Phase 1).
- Tóm tắt AI cuối ngày 18:30 đẩy push cho BQT.
- Tóm tắt tuần/tháng tự động.
