# CÔNG VIỆC — v0.1.4

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
| | Trợ lý 2.0: có ngữ cảnh thật, xử lý ngay + Hoàn tác, văn phong sâu (Sonnet 4.6) | ✅ v0.1.4 |
| Báo cáo | Nói/gõ · AI chuẩn hóa · cờ vấn đề · ảnh WebP nén (≤10) · lịch sử 7 ngày | ✅ v0.1.0 |
| | Đối chiếu kế hoạch: phản hồi từng mục, thiếu bị đòi, tự cập nhật kế hoạch | ✅ v0.1.4 |
| Kế hoạch | Tạo bằng giọng nói / form · nhắc trước X phút · 14 ngày | ✅ v0.1.0 |
| Nhắc việc | Auto: check-in 9:00 · báo cáo 17:00 · kế hoạch đến giờ · quá hạn | ✅ v0.1.0 (hiện in-app) |
| | Web Push (khi app đóng) | ❌ Patch 04 |
| Admin | Tạo/sửa/khóa tài khoản · reset mật khẩu · phòng ban | ✅ v0.1.0 |
| Dashboard BQT | Nhân sự hôm nay · vấn đề nổi đầu · báo cáo toàn công ty 7 ngày | ✅ v0.1.0 |
| | Nhóm theo địa điểm: VP·Xưởng nón vải / Xưởng BH / Công tác (rõ nơi) / Chưa gửi | ✅ v0.1.4 |
| | Kế hoạch toàn công ty 7 ngày tới | ✅ v0.1.4 |
| | Realtime tự cập nhật | ❌ Patch 04 |
| Nhật ký AI | Bản gốc ↔ bản chuẩn hóa · đếm token/người | ✅ v0.1.0 |
| Giao diện | Deep Navy Aurora: sáng (mặc định) + tối, glass, glow, mesh | ✅ v0.1.4 |
| Công việc 2 dạng | Thường xuyên / có thời hạn + timeline 360 (thiết kế xong, xem mục Kiến trúc) | ❌ v0.1.5 |
| Giao việc | Hạng mục · deadline · tiến độ (bảng đã sẵn, UI chưa mở) | ❌ v0.1.5 |
| Tóm tắt AI | Cuối ngày 18:30 · cuối tuần · cuối tháng | ❌ Patch 05 |

---

## NHẬT KÝ NỐI TIẾP

### v0.1.4 — 08/07/2026 · Deep Navy Aurora + Trợ lý 2.0 + Vòng đời Kế hoạch↔Báo cáo

**Aroma chốt sau khi duyệt 2 bản preview:** tone Deep Navy Aurora (không pha tím, hue 187°–220°), sáng mặc định.

**① Giao diện — viết lại toàn bộ `css/app.css`:**
- Sáng (mặc định): nền porcelain #EEF3FA + mesh, chữ navy #0A1830, accent aurora #0284C7.
- Tối: deep navy #050B1F, glass morphism card, aurora #38BDF8.
- Film aurora chuyển động 24s/lần; nút mic 2 vòng pulse; timeline glow; toast navy viền aurora.
- Đổi tên class: `btn-gold` → `btn-primary`, `badge-teal` → `badge-acc` (đồng bộ toàn bộ js).
- Icon PWA mới: CV aurora trên navy.

**② Trợ lý 2.0 — viết lại `ai-gateway` + `05-troly.js`:**
- Edge Function nạp NGỮ CẢNH THẬT trước khi gọi Claude: check-in hôm nay, di chuyển, đã báo cáo chưa, kế hoạch đang chờ (quá hạn 7 ngày → 7 ngày tới, kèm id). Trợ lý "biết" tình hình thay vì đoán.
- Prompt mới: được phép hoàn thiện diễn đạt (văn phong doanh nghiệp, câu trọn vẹn, có chiều sâu) — ranh giới là KHÔNG bịa dữ kiện. Một lời kể → tách và xử lý đủ mọi loại việc lồng nhau.
- **Xử lý ngay** (yêu cầu Aroma): check-in, di chuyển, kế hoạch, nhắc → thực thi lập tức, hiện thẻ "Em đã xử lý ngay" + nút Hoàn tác từng dòng. "Hôm nay anh làm ở văn phòng…" → chấm vị trí luôn, không hỏi lại.
- Báo cáo (trình BQT) vẫn xem trước → Xác nhận.
- Model trợ lý nâng lên **Sonnet 4.6** (đổi lại Haiku bằng 1 dòng SQL app_settings).

**③ Vòng đời Kế hoạch ↔ Báo cáo (nghiệp vụ lõi Aroma định nghĩa):**
- Kế hoạch gửi trước bất kỳ ngày nào, bắt buộc có ngày giờ dự kiến → hệ thống tự lên lịch BQT + nhắc.
- Báo cáo cuối ngày = phản hồi TỪNG kế hoạch: AI đối chiếu, điền kết quả kế hoạch được nhắc, gắn cờ kế hoạch bị bỏ sót.
- Màn xem trước có khối "Đối chiếu kế hoạch": mỗi mục chọn Hoàn thành / Đang thực hiện / Chưa thực hiện / Hủy + ô phản hồi. Mục bỏ trống → **chặn gửi** cho tới khi chọn xong (đúng quy tắc "hoặc phản hồi, hoặc xóa").
- Gửi xong: kế hoạch Hoàn thành → DA_THUC_HIEN; Hủy → DA_HUY; Đang làm/Chưa làm → giữ CHO, tiếp tục nhắc hôm sau. Bảng `bao_cao_ke_hoach` lưu liên kết kiểm toán.
- Tab Báo cáo hiện sẵn "Kế hoạch chờ phản hồi hôm nay" để nhìn trước khi nói.

**④ Dashboard BQT theo địa điểm thực tế:**
- Trạng thái mới: `VAN_PHONG` = "Văn phòng · Xưởng nón vải" (2 nơi là 1), thêm `XUONG_BH` = "Xưởng bảo hiểm".
- "Hôm nay ai ở đâu": nhóm Chưa cập nhật (đỏ, đầu tiên) / VP·Xưởng nón vải / Xưởng BH / Công tác (**rõ từng người đi đâu**) / Ở nhà / Nghỉ phép. Mỗi người kèm badge Đã BC / Chưa BC.
- Khối mới: Kế hoạch toàn công ty 7 ngày tới.

**File thay đổi (frontend):** `css/app.css` (viết lại), `js/00-config.js`, `js/03-ui.js` (+icon factory, undo), `js/05-troly.js` (viết lại), `js/10..14-tab-*.js` (đổi class + dashboard + khối kế hoạch), `js/99-app.js`, `sw.js`, `index.html`, `manifest.webmanifest`, `icons/*`.
**Edge Function:** dán lại `supabase/functions/ai-gateway/index.ts` (bản v2) vào Dashboard → Deploy.
**SQL:** `UPDATE_v0.1.4.sql` (file ngoài zip).
**Kiểm chứng:** SQL smoke test vòng đời trên Postgres mô phỏng Supabase — kế hoạch chờ 2 → báo cáo đối chiếu → kh1 DA_THUC_HIEN, kh2 giữ CHO và vẫn bị đòi phản hồi, 2 dòng liên kết, xóa di chuyển OK, BQT có kế hoạch sắp tới. Toàn bộ JS pass syntax check.

---

## KIẾN TRÚC v0.1.5 — CÔNG VIỆC 2 DẠNG + TIMELINE 360 (đã thiết kế, chờ Aroma duyệt để code)

**Hai dạng công việc:**

| | Thường xuyên (routine) | Xử lý có thời hạn (project) |
|---|---|---|
| Ví dụ | Kiểm quỹ mỗi sáng, báo cáo doanh số | Triển khai hệ thống X trước 30/07 |
| Lặp | Hằng ngày / tuần / tháng (cấu hình) | Không lặp |
| Deadline | Theo chu kỳ | 1 deadline tổng + các mốc |
| Theo dõi | Tỷ lệ thực hiện đúng chu kỳ (%) | Timeline mốc + % tiến độ |

**Schema bổ sung (v0.1.5):**
- `cong_viec` thêm: `dang` (THUONG_XUYEN/THOI_HAN), `chu_ky` jsonb (ngày trong tuần/tháng), `han_hoan_thanh`.
- Bảng mới `cong_viec_moc` (timeline): id, cong_viec_id, ten_moc, han, trang_thai, hoan_thanh_luc.
- Bảng `cong_viec_capnhat` (đã có) làm nhật ký tiến độ, mỗi cập nhật kèm ảnh.

**Màn "Chi tiết 360" cho công việc có thời hạn:**
- Đầu trang: tiến độ tổng (%), deadline đếm ngược, người phụ trách, mức ưu tiên.
- Timeline dọc các mốc: mốc xong (aurora, glow) / đang tới (vàng) / trễ (đỏ).
- Dòng thời gian hoạt động: mọi kế hoạch + báo cáo + cập nhật liên quan công việc này gom về một chỗ (join qua `bao_cao_ke_hoach` + `cong_viec_capnhat`).
- Thống kê: số kế hoạch đã đăng ký / đã phản hồi / trễ; biểu đồ tiến độ theo tuần.
- Trợ lý hiểu ngữ cảnh công việc: "việc X tới đâu rồi?" → tóm tắt 360 bằng lời.

**Công việc thường xuyên:** mỗi sáng cron tự sinh kế hoạch con theo chu kỳ → chảy vào đúng vòng đời Kế hoạch↔Báo cáo hiện có, BQT thấy tỷ lệ tuân thủ theo người/phòng.

---

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

**v0.1.5:** Công việc 2 dạng (thường xuyên / có thời hạn) + màn Chi tiết 360 + thống kê — theo kiến trúc ở mục trên, chờ Aroma duyệt.

**v0.1.6:** Web Push (nhắc khi app đóng) · đăng nhập khuôn mặt (cần module từ App Chấm công) · Realtime dashboard · tóm tắt AI cuối ngày 18:30 cho BQT.
