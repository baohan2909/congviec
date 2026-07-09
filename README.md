# CÔNG VIỆC — v0.1.9

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
4. **Thêm secrets** — Edge Functions → Secrets:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
   - `CRON_SECRET` = `cv_a8f3e91d27b64c5f9a01d4e6b8c2f7a3`
   - `VAPID_PUBLIC` = `BAKOctpIobn0_A0cm0zKj6dj3dPZAjYoWKklMgRBWPuKtQWkPSdY6Dx6pvzSydfpUN5und9cqAkda8sFHRWhlhw`
   - `VAPID_PRIVATE` = `DBRrVhs7eSlISvtYAkllcDwv0Ze7sVOj3TovSfGUDHM`
4b. **Deploy thêm 2 Edge Function**: `push-sender` và `daily-digest` (dán từ file kèm patch).
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
| | Đăng nhập khuôn mặt (on-device, 2 lớp so khớp) | ✅ v0.1.5 ⚠️ cần test máy thật |
| Check-in | 4 trạng thái · timeline di chuyển | ✅ v0.1.0 |
| Ghi âm | Liền mạch kiểu ChatGPT (Tạm dừng/Gửi ngay) · lưu file gốc | ✅ v0.1.0 |
| Trợ lý AI | Cá nhân theo tên · 6 công cụ agentic · bản xem trước Xác nhận | ✅ v0.1.0 |
| | Trợ lý 2.0: có ngữ cảnh thật, xử lý ngay + Hoàn tác, văn phong sâu (Sonnet 4.6) | ✅ v0.1.4 |
| Báo cáo | Nói/gõ · AI chuẩn hóa · cờ vấn đề · ảnh WebP nén (≤10) · lịch sử 7 ngày | ✅ v0.1.0 |
| | Đối chiếu kế hoạch: phản hồi từng mục, thiếu bị đòi, tự cập nhật kế hoạch | ✅ v0.1.4 |
| Kế hoạch | Tạo bằng giọng nói / form · nhắc trước X phút · 14 ngày | ✅ v0.1.0 |
| Nhắc việc | Auto: check-in 9:00 · báo cáo 17:00 · kế hoạch đến giờ · quá hạn | ✅ v0.1.0 (hiện in-app) |
| | Web Push khi app đóng (VAPID + push-sender 5 phút/lần) | ✅ v0.1.5 ⚠️ cần test máy thật |
| Admin | Tạo/sửa/khóa tài khoản · reset mật khẩu · phòng ban | ✅ v0.1.0 |
| Dashboard BQT | Nhân sự hôm nay · vấn đề nổi đầu · báo cáo toàn công ty 7 ngày | ✅ v0.1.0 |
| | Nhóm theo địa điểm: VP·Xưởng nón vải / Xưởng BH / Công tác (rõ nơi) / Chưa gửi | ✅ v0.1.4 |
| | Kế hoạch toàn công ty 7 ngày tới | ✅ v0.1.4 |
| | Realtime tự cập nhật | ❌ Patch 04 |
| Nhật ký AI | Bản gốc ↔ bản chuẩn hóa · đếm token/người | ✅ v0.1.0 |
| Giao diện | Deep Navy Aurora: sáng (mặc định) + tối, glass, glow, mesh | ✅ v0.1.4 |
| Công việc 2 dạng | Thường xuyên (tự sinh kế hoạch theo chu kỳ) / có thời hạn | ✅ v0.1.5 |
| Giao việc | ADMIN/Trưởng BP giao người hoặc phòng · ưu tiên · báo người nhận | ✅ v0.1.5 |
| Chi tiết 360 | Timeline mốc tự tính tiến độ · dòng hoạt động gom KH+BC+cập nhật · thống kê tuân thủ | ✅ v0.1.5 |
| Tóm tắt AI | Cuối ngày 18:30 cho BQT (bảng tong_hop_ngay + push) | ✅ v0.1.5 |
| Dashboard | Tự cập nhật 30 giây khi mở tab Tổng quan | ✅ v0.1.5 |
| Trợ lý | Biết công việc đang phụ trách · tool cập nhật tiến độ tự động | ✅ v0.1.5 |
| Tóm tắt AI | Cuối ngày 18:30 · cuối tuần · cuối tháng | ❌ Patch 05 |

---

## NHẬT KÝ NỐI TIẾP

### v0.2.0 — 09/07/2026 · Trợ lý mượt & bao quát · Trình bày tinh gọn · Sửa lỗi UX

**SQL phải chạy:** `UPDATE_v0.2.0.sql` (thêm `fn_troly_toan_canh`, bump cache_version → 0.2.0).
**Edge Function phải deploy lại:** `ai-gateway` (kèm fix `laQuanLy` + `chi_tiet` lỗi + tool `toan_canh` + prompt tinh gọn 2 nhóm phẳng).

**① Trợ lý — tiến trình động (05-troly.js, app.css):**
- Thay màn hình trống/skeleton bằng chỉ báo 3 bước động: đang nghe → đang hiểu → đang soạn, kèm orb nảy + echo lại câu vừa nói. Không còn cảm giác khựng.

**② Báo cáo — composer gọn (11-tab-baocao.js):**
- Bỏ nút "Nói" (lỗi không bấm được). Nút chính đổi thành **"Trợ lý — nói để báo cáo"**: bấm là ghi âm → nói → tự chuẩn hóa & gửi.
- Gõ tay / thêm ảnh / gửi nguyên văn gom vào `<details>` phụ. Handler null-safe.
- Bỏ chặn cứng khi còn kế hoạch chờ — cho gửi tự do.

**③ Kế hoạch chờ phản hồi (03-ui.js, 11):**
- Thêm `gioThongMinh()`: việc hôm nay chỉ hiện GIỜ (đưa lên trước), khác ngày mới hiện ngày+giờ.

**④ Trợ lý hiểu ngữ cảnh, không cứng nhắc (ai-gateway, 05):**
- Prompt `tao_bao_cao` viết lại: kể gì báo cáo nấy, không đòi đủ mục, không bịa "chưa làm". Bỏ ràng buộc `ke_hoach_thieu`.
- Client bỏ chặn "phải chọn kết quả mọi kế hoạch mới cho gửi" — chỉ ghi nhận mục đã chọn.

**⑤ Nhắc hẹn "thực sự reo" (12-tab-kehoach.js):**
- iOS KHÔNG cho PWA tạo báo thức native. Giải pháp trung thực: nút **"Thêm vào Lịch (báo thức reo)"** xuất file `.ics` có VALARM → thêm vào app Lịch iPhone, Lịch tự reo đúng giờ kèm âm.

**⑥ Quản trị — Lịch trình hết trùng (14-tab-quantri.js):**
- Bỏ tiêu đề nhóm lặp lại tag đếm ("Xưởng bảo hiểm" 2 lần). Giờ là danh sách phẳng `.loc-row`, lọc bằng chip tag ("Tất cả" trước tiên).

**⑦ Trợ lý bao quát toàn hệ thống (UPDATE_v0.2.0.sql, ai-gateway, 05):**
- `fn_troly_toan_canh`: đếm nhân sự theo vị trí (bảo hiểm/công tác/văn phòng...), đã/chưa báo cáo, việc khẩn & ưu tiên, vấn đề phát sinh, việc trễ.
- Tool `tra_cuu` thêm loại `toan_canh`. Hỏi "hôm nay bao nhiêu nhân sự", "báo cáo tình hình cả ngày", "có gì khẩn" → trả số liệu thật. Chỉ quản lý.

**⑧ Trình bày tinh gọn — CHỈ 1 CẤP bullet (ai-gateway, mdMini):**
- `tao_bao_cao` & `lap_ke_hoach_ngay`: chỉ 2 nhóm phẳng **Công việc thường xuyên** / **Công việc phát sinh**, mỗi việc 1 gạch đầu dòng. Bỏ đánh số I/II/III, bỏ đa cấp. Vấn đề thành dòng "- ⚠ …".

**⑨ Kế hoạch — 2 dạng xem (12-tab-kehoach.js, app.css):**
- Toggle **Timeline / Văn bản** cho lịch trong ngày. Văn bản = bản gọn 1 cấp bullet theo giờ (`keHoachSangVanBan`).

**⑩ Chuyển tab lỗi "không tải được dữ liệu" (01-supabase.js):**
- `rpc()` thêm retry 3 lần (0→500→1000ms) cho lỗi mạng tạm thời; lỗi nghiệp vụ vẫn báo ngay, `PHIEN_HET_HAN` vẫn reload.

**⑪ Phản hồi bấm & vòng quét khuôn mặt (02-auth, 13, 99-app, app.css, face):**
- Mọi nút giờ có phản hồi tức thì: rung nhẹ khi chạm (haptic toàn cục) + hiệu ứng nhấn rõ hơn (scale .955 + tối nhẹ), tắt highlight xanh mặc định iOS.
- Đăng xuất: có spinner ngay, không chờ server quá 700ms (trước đây retry mạng làm treo tới 1.5s) → thoát nhanh, mượt.
- Vòng quét khuôn mặt: bỏ animation cũ (vừa xoay 270° vừa co giãn cung → giật, lúc hiện 3/4 lúc tí xíu). Thay bằng MỘT cung cố định (~28%) xoay tròn đều 360° mượt như spinner iOS; thành công thì vòng đầy trọn + check.

**Đề xuất tính năng (chờ anh duyệt):**
- Hồ sơ nhân viên đầy đủ + nhắc sinh nhật; khóa/mở/đổi vai trò ngay trong danh sách thành viên; xuất Excel nhân sự + báo cáo tháng cho TGĐ; đăng nhập QR cho nhân viên lớn tuổi; nhật ký thao tác admin (audit log).

---

### v0.1.9 — 09/07/2026 · Tạo tài khoản · Quản trị gọn · Composer báo cáo · Mặc định sáng

**① Composer báo cáo:**
- Thư viện ảnh thu nhỏ (lưới 4 cột thay 3, gap nhỏ) — gọn hơn.
- Bấm **Nói** khi đang ở tab Báo cáo: recorder hiện panel **kế hoạch cần phản hồi cuộn được ngay trên đầu** — vừa nói vừa nhìn từng mục để phản hồi đúng nội dung, không phải kéo xuống. (Thêm tham số `contextHtml` cho `openRecorder`.)

**② Quản trị — bố cục lại theo yêu cầu:**
- Đổi tên "Kế hoạch Ban điều hành" → **"Lịch trình Ban điều hành"** (đúng mục đích: thể hiện vị trí từng người). Mỗi người có **tag vị trí** (Văn phòng / Xưởng BH / Công tác ngoài / Tại nhà / Nghỉ phép); hàng **tag đếm** trên đầu cho biết ngay mỗi nơi bao nhiêu người, bấm để lọc.
- "Công tác" đổi nhãn thành **"Công tác ngoài"** (ra ngoài phạm vi công ty).
- **Kế hoạch hôm nay lên TRƯỚC báo cáo**; đây là kế hoạch công việc của Ban điều hành **hôm nay** (RPC `fn_bqt_ke_hoach_homnay`), KHÔNG phải 7 ngày tới. **Bỏ hẳn** mục "Kế hoạch toàn công ty 7 ngày tới".
- Kế hoạch & Báo cáo đều nhóm **theo tên từng người**, việc nằm dưới tên. Mỗi card có **header ngày** (Ngày 09/07/2026) nhưng tiêu đề vẫn là "Hôm nay"; **bỏ ngày trong từng dòng** (đã có ở header).

**③ Mặc định giao diện SÁNG** khi mở lần đầu (không theo hệ điều hành nữa) — ai cần mới tự chuyển tối.

**④ Tài khoản admin — thêm khu vực Quản trị gọn (chỉ ADMIN thấy):**
- **Tạo tài khoản**: nhập Họ tên, Ngày sinh, Chức vụ, SĐT, Vai trò, Phòng ban. Tên đăng nhập = **họ tên viết liền không dấu** (trùng thì thêm số), mật khẩu mặc định **NS2396**, buộc đổi lần đầu. Đăng nhập giờ chấp nhận **cả username lẫn mã NV**.
- **Nhập từ Excel**: tải file mẫu .xlsx, chọn file, đọc bằng SheetJS, xem trước số dòng rồi nhập hàng loạt (`fn_admin_tao_tai_khoan_loat`), báo rõ thành công/lỗi từng dòng.
- **Xóa dữ liệu theo ngày**: chọn Báo cáo/Kế hoạch + ngày, có bước xác nhận (`fn_admin_xoa_theo_ngay`).

**File thay đổi:** `js/04-voice.js`, `js/05-troly.js`, `js/11-tab-baocao.js`, `js/13-tab-taikhoan.js`, `js/14-tab-quantri.js`, `js/99-app.js`, `js/00-config.js`, `css/app.css`, `sw.js`, `README.md`.
**SQL:** `UPDATE_v0.1.9.sql` (cột hồ sơ, tạo TK không dấu + mật khẩu NS2396, import loạt, xóa theo ngày, đăng nhập bằng username, nhãn Công tác ngoài, kế hoạch hôm nay BQT).
**Edge Function:** không đổi (ai-gateway v6 vẫn dùng).
**Kiểm chứng:** SQL 8/8 pass (tạo TK, username không dấu, trùng tên +số, đăng nhập username/mã NV, import loạt, xóa theo ngày, kế hoạch hôm nay, nhãn). JS pass syntax, RPC đối chiếu đủ. Composer/dashboard cần Aroma xem máy thật.

**Gợi ý phát triển thêm (chưa làm, chờ Aroma duyệt):**
- Trang **hồ sơ nhân viên** đầy đủ (ngày sinh → nhắc sinh nhật, thâm niên).
- **Khóa tạm / mở khóa / đổi vai trò** ngay trong danh sách thành viên.
- **Xuất Excel**: danh sách nhân sự, báo cáo tổng hợp tháng để trình TGĐ.
- **QR đăng nhập nhanh** cho thành viên lớn tuổi (quét là vào, khỏi gõ).
- **Nhật ký quản trị** (ai tạo/xóa gì, khi nào) để minh bạch.

---

### v0.1.8 — 08/07/2026 · Trợ lý làm thay toàn bộ nghiệp vụ công việc

Aroma chốt: trợ lý phủ **toàn bộ nghiệp vụ công việc** (giữ cơ chế "làm ngay + Hoàn tác"), **trừ** quản trị nhân sự và xóa dữ liệu (vẫn bấm tay có xác nhận — tránh rủi ro nghe nhầm tên/mã trên 540 nhân sự).

**3 nhóm năng lực mới cho trợ lý (nâng ai-gateway → v6):**
- **Giao việc bằng lời** — tool `giao_viec`: "giao phòng kỹ thuật việc X hạn thứ 6", "giao anh Nam kiểm kho mỗi sáng" → tạo công việc (có thời hạn/thường xuyên), báo người nhận. Chỉ chạy khi người dùng là quản lý; khớp người/phòng qua danh sách mã nạp sẵn trong ngữ cảnh. Có **Hoàn tác** (xóa việc vừa tạo trong 10 phút).
- **Chốt công việc** — tool `chot_cong_viec`: "việc kho mới xong rồi" → Hoàn thành (tiến độ 100%); "dự án X vướng mắc" → báo vướng mắc.
- **Tra cứu bằng lời** — tool `tra_cuu` + RPC `fn_troly_tra_cuu`: "tuần này ai chưa báo cáo", "ai chưa chấm công", "hôm nay có vấn đề gì", "việc nào đang trễ", "việc X tới đâu rồi", "hôm nay tôi làm gì" → lấy **số liệu thật** rồi trình bày bài bản (đánh số), không bịa. Phạm vi công ty chỉ mở cho quản lý (`CAN_QUYEN_QUAN_LY` nếu không đủ quyền).

**Tổng năng lực trợ lý hiện tại — 14 công cụ:** chấm nơi làm việc · thêm di chuyển · lập kế hoạch ngày (văn bản + timeline) · tạo kế hoạch lẻ · tạo nhắc · soạn báo cáo (đối chiếu kế hoạch) · sửa kế hoạch · sửa di chuyển · bổ sung báo cáo · cập nhật tiến độ việc · **giao việc** · **chốt hoàn thành/vướng mắc** · **tra cứu số liệu** · trả lời/trò chuyện.

**Ranh giới giữ nguyên (không cho trợ lý tự chạy):** tạo/sửa/xóa nhân viên, đổi phân quyền, xóa dữ liệu vận hành — bấm tay trong tab Quản trị, có bước xác nhận.

**File thay đổi:** `js/05-troly.js`, `js/00-config.js`, `sw.js`, `README.md`.
**SQL:** `UPDATE_v0.1.8.sql` (RPC `fn_troly_tra_cuu` + `fn_xoa_cong_viec_moi`).
**Edge Function:** dán lại `ai-gateway` (v6).
**Kiểm chứng:** SQL 6/6 pass (tra cứu chưa báo cáo, việc trễ, tìm việc, tóm tắt ngày, undo giao việc, chặn quyền). JS pass syntax, RPC đối chiếu đủ.

---

### v0.1.7 — 08/07/2026 · Kế hoạch bài bản · Timeline thông minh · Chuẩn hóa trình bày · An toàn giọng nói

**① An toàn dữ liệu giọng nói (ưu tiên cao nhất) — `js/08-luutam.js` mới:**
- Mọi đoạn vừa nói được GIỮ vào localStorage NGAY trước khi gọi AI (tự động, không phải "lưu nháp" thủ công).
- AI xử lý xong + dữ liệu đã lưu hệ thống → xóa bản tạm. AI lỗi/mất mạng → giữ nguyên, hiện sheet "Trợ lý đang trục trặc" cho xem lại toàn văn + Sao chép + Thử lại. Thoát app giữa chừng → lần mở sau tự hỏi "Khôi phục nội dung đã nói".
- Kết quả: nội dung người dùng nói KHÔNG BAO GIỜ mất vì lỗi AI/hệ thống.

**② AI lập kế hoạch bài bản — 2 dạng SONG SONG:**
- Tool mới `lap_ke_hoach_ngay`: khi người dùng nói một loạt việc, AI trả về đồng thời (a) **BẢN KẾ HOẠCH VĂN BẢN** trình bày như tài liệu — đánh số, gạch đầu dòng, phân nhóm, **in đậm** từ khóa quan trọng; và (b) **danh sách tách theo giờ** để hệ thống nhắc.
- Sheet xem trước có 2 tab: "Bản kế hoạch" (đọc) và "Dòng thời gian" (sửa tên / bỏ từng mục). Xác nhận xong mới tạo → tự nhảy sang tab Kế hoạch.
- Renderer markdown mới `mdMini()`: số thứ tự dạng ô vuông aurora, bullet chấm tròn, tiêu đề mục in đậm — áp dụng thống nhất cho kế hoạch, báo cáo, tổng hợp AI.

**③ Timeline thông minh (gom mốc thực tế) — viết lại `veHourline` → `veHourline` timeplan:**
- KHÔNG liệt kê mọi giờ trống nữa. Chỉ hiện các mốc CÓ việc (07:30, 09:00, 13:30…), nối bằng trục dọc có chấm màu theo trạng thái.
- Mốc "Bây giờ" chèn đúng vị trí trong dòng chảy. Sửa triệt để lỗi **tràn nội dung / tràn lề hai bên** (chip có ellipsis, grid cố định 52px·20px·1fr).

**④ Báo cáo dựa kế hoạch, 2 nhóm, đánh số** — nâng cấp tool `tao_bao_cao`:
- Cấu trúc chuẩn: **I. Công việc theo kế hoạch** (đánh số, việc thường ngày như quản lý xưởng nêu rõ sự cố/số lượng/vấn đề) · **II. Công việc phát sinh** (đánh số) · **III. Vấn đề & đề xuất**. Liên kết chặt với kế hoạch đã lập.

**⑤ Chuẩn hóa toàn hệ thống:** mọi công việc/báo cáo đánh số, cùng một logic trình bày qua `mdMini`.

**⑥ Dashboard Quản trị — gọn & có bộ lọc:**
- Đổi tên "Hôm nay ai ở đâu" → **"Kế hoạch Ban điều hành"**.
- Thẻ nhân sự thu gọn 1 dòng (avatar nhỏ, chấm xanh/vàng = đã/chưa báo cáo) — hết tình trạng thẻ quá cao chiếm diện tích.
- **Bộ lọc nhóm** (Tất cả / Chưa cập nhật / từng địa điểm) ngay trên danh sách.
- Bấm một thành viên → sheet **thông tin đầy đủ** (mã NV, phòng ban, nơi làm việc, địa điểm, tình trạng báo cáo, timeline di chuyển).

**⑦ Nơi làm việc hôm nay — nhất quán & gọn:**
- Bỏ nút "Đổi" (thừa — phải nhập lại). Thay bằng "Đổi nơi làm việc" (mở lại lưới chọn trong sheet) + "Thêm nơi làm việc".
- Thẻ trạng thái đồng đều kích thước (lưới 2 cột, thẻ lẻ cuối trải rộng).
- "Cập nhật di chuyển" → **"Thêm nơi làm việc"**: chỉ nhập Thời gian + Nơi làm việc (giờ và nơi cùng một hàng, hết lỗi giờ rớt xuống dưới), có nút "Nhờ trợ lý".

**⑧ Sửa lỗi reload** (app hay tự nhảy về Quản trị): `setInterval` tự-làm-mới của tab Quản trị trước đây vẫn chạy sau khi chuyển tab và vẽ đè lên tab khác. Nay chỉ làm mới khi đang thực sự ở tab Quản trị (`window.cvTabHienTai==='quantri'` và `#qtBody` còn trong DOM), nếu không thì tự dừng timer.

**File thay đổi (frontend):** `js/08-luutam.js` (mới), `js/03-ui.js` (mdMini), `js/05-troly.js`, `js/10-tab-homnay.js`, `js/12-tab-kehoach.js`, `js/11-tab-baocao.js`, `js/14-tab-quantri.js`, `js/99-app.js`, `js/00-config.js`, `css/app.css`, `sw.js`, `README.md`.
**Edge Function:** dán lại `ai-gateway` (v5 — thêm tool `lap_ke_hoach_ngay`, nâng cấp `tao_bao_cao`).
**SQL:** KHÔNG có — patch thuần frontend + prompt, mọi RPC đã có sẵn (đã đối chiếu 35 RPC client gọi đều tồn tại).
**Kiểm chứng:** toàn bộ JS pass syntax; đối chiếu RPC đầy đủ; braces Edge Function cân bằng. Timeline/nơi làm việc/dashboard cần Aroma xem trên máy để xác nhận cảm giác.

---

### v0.1.6 — 08/07/2026 · Face mượt + Sửa/Xóa/Bổ sung toàn diện + Timeline giờ

**① Đăng nhập khuôn mặt — mượt & 1x:**
- **Camera cố định 1x**: getUserMedia với `aspectRatio: 1`, khung 640×640, thêm `applyConstraints({advanced:[{zoom: min}]})` để ép về 1x thật trên máy có zoom (một số iPhone/Android). Hết cảnh camera bị crop/zoom.
- **Vòng ring loading SVG** 4 trạng thái rõ ràng: `dang-tai` (progress quay vòng vô định + ring xoay), `san-sang` (progress 75%), `dang-tim` (thở chậm), `thanh-cong` (progress đầy, hiện dấu check phóng vào), `that-bai` (đỏ + rung ngang). Không dùng vạch quét chạy dọc gây nhấp nháy.
- **Mượt**: preload model song song ngay khi mở app (không đợi bấm nút), chu kỳ quét nới lên 260ms, chờ 2 khung ổn định mới nhận (bỏ khung đầu thường mờ), đóng overlay có transition `fadeOut` 220ms thay vì biến mất tức thì.
- Hủy giữa chừng: tắt track camera sạch, không để camera "còn sáng đèn".

**② Sửa / Xóa / Bổ sung toàn diện** — bằng tay và qua trợ lý:
| Loại nội dung | Sửa | Xóa/Hủy | Bổ sung |
|---|---|---|---|
| Kế hoạch | Tiêu đề · giờ · địa điểm · nhắc trước | Hủy (DA_HUY, khôi phục được) | — |
| Di chuyển | Giờ · nơi · lý do | Xóa hẳn | — |
| Báo cáo (đã gửi) | ❌ (nội dung gốc bất khả sửa — audit) | ADMIN xóa mềm | ✅ Bổ sung nội tại, kèm dấu thời gian *"Bổ sung 15:30: ..."* |
| Check-in | Chấm lại đè lên | — | — |
| Công việc | Người tạo/ADMIN sửa tiêu đề · hạn · ưu tiên · người nhận | ADMIN xóa | Nhật ký cập nhật (đã có) |

- Bấm chip kế hoạch (trong list hoặc timeline) → sheet chi tiết với các nút Sửa / Đã xong / Hủy / Khôi phục. Sửa giờ tự động reset cờ `da_sinh_nhac` để hệ thống nhắc lại đúng giờ mới.
- Bổ sung báo cáo: card "Bổ sung báo cáo hôm nay" xuất hiện ngay khi báo cáo đã gửi trong tab Báo cáo.
- **Trợ lý hiểu và tự làm**: prompt bổ sung nguyên tắc SỬA/XÓA/BỔ SUNG; ngữ cảnh giờ có thêm *Di chuyển hôm nay (id + giờ + nơi)* và *Báo cáo hôm nay (id + trích 200 ký tự đầu)*. AI khớp id qua giờ + từ khóa, không lấy được id chắc chắn thì hỏi lại 1 câu thay vì tạo trùng.
- Ví dụ AI xử lý: *"dời họp NCC 3h sang mai 9h"* → `sua_ke_hoach(id, thoi_gian)`; *"bổ sung báo cáo sáng nay: đã ký hợp đồng với NCC vải kaki"* → `bo_sung_bao_cao(id, ...)`; *"đổi di chuyển 2h chiều thành 3h"* → `sua_di_chuyen(id, gio)`. Mọi thao tác đều có nút **Hoàn tác** trong thẻ "Em đã xử lý" — undo cho sửa là quay về giá trị cũ (RPC trả về cả `cu` và `moi`). Bổ sung báo cáo là **không undo** (nội dung đã được audit).

**③ Timeline theo giờ trong ngày** (tab Kế hoạch):
- Segment: Hôm nay · Ngày mai · Tuần này · 30 ngày. "Hôm nay" và "Ngày mai" hiện timeline; các segment khác giữ dạng list nhóm ngày.
- Card "Lịch trong ngày" bên dưới danh sách: trục dọc từ giờ sớm nhất (min 6h) đến giờ muộn nhất (max 22h) → tự co giãn nếu có việc sớm hơn/muộn hơn. Mỗi slot cao 46px.
- Chip trên timeline: **aurora** cho kế hoạch tương lai, **đỏ** cho quá giờ mà chưa xong, **xám gạch ngang** cho đã xong, **vàng** cho di chuyển.
- Vạch "Bây giờ" glow aurora chạy ngang, có nhãn giờ HH:MM ở cạnh; tự cuộn vào view khi mở tab.
- Bấm chip → mở sheet chi tiết như bấm list.

**RPC mới:** `fn_sua_ke_hoach`, `fn_sua_di_chuyen`, `fn_bo_sung_bao_cao`, `fn_xoa_bao_cao` (ADMIN), `fn_sua_cong_viec`. Tất cả kiểm quyền chặt (chỉ chủ nội dung hoặc ADMIN), trả về `{cu, moi}` để client dựng Hoàn tác.

**File thay đổi:** `js/07-face.js` (viết lại), `js/12-tab-kehoach.js` (viết lại), `js/05-troly.js`, `js/11-tab-baocao.js`, `js/02-auth.js`, `js/00-config.js`, `sw.js`, `css/app.css`, `README.md`.
**SQL:** `UPDATE_v0.1.6.sql` (5 RPC + bump).
**Edge Function:** dán lại `ai-gateway` (v4).
**Kiểm chứng:** SQL 6/6 kịch bản pass (sửa kế hoạch reset nhắc, sửa di chuyển, bổ sung báo cáo, chặn bổ sung ngày khác, sửa công việc, chặn kế hoạch người khác). Toàn bộ JS pass syntax. Face & timeline cần Aroma test trên iPhone thật để xác nhận cảm giác "mượt".

---

### v0.1.5 — 08/07/2026 · Phát triển toàn bộ các nhánh còn lại

**① Công việc 2 dạng + Giao việc + Chi tiết 360 (tab "Việc" mới):**
- Dạng **thường xuyên**: chu kỳ theo thứ/ngày tháng + giờ; cron 05:30 VN tự sinh kế hoạch con cho từng người (giao phòng = cả phòng), chống trùng — chảy thẳng vào vòng đời Kế hoạch↔Báo cáo có sẵn; thống kê "Kỷ luật 30 ngày" (% tuân thủ).
- Dạng **có thời hạn**: hạn hoàn thành + mốc lộ trình; đánh dấu mốc XONG → tiến độ tự tính; đủ 100% tự HOAN_THANH; cron 08:00 nhắc deadline còn ≤24h / quá hạn.
- **Chi tiết 360**: đếm ngược hạn, thanh tiến độ, timeline mốc (trễ = đỏ), **dòng hoạt động** gom kế hoạch + phản hồi báo cáo + nhật ký cập nhật về một chỗ, cập nhật tiến độ bằng slider + ghi chú + mic, nút Vướng mắc / Hoàn thành.
- Giao việc: ADMIN toàn quyền; TRUONG_BP trong phòng mình; người nhận được nhắc ngay.
- Trợ lý biết danh sách công việc đang phụ trách → *"việc kho mới xong được nửa rồi"* → tự cập nhật tiến độ 50% + ghi nhật ký (auto, có trong thẻ Đã xử lý).

**② Web Push (nhắc khi không mở app):**
- Cặp khóa VAPID đã sinh sẵn, public nằm trong `00-config.js`, private đặt vào Secrets.
- Edge Function `push-sender`: cron gọi 5 phút/lần, đẩy các nhắc việc tới hạn, tự dọn subscription chết (404/410).
- Bật/tắt trong Tài khoản → Thông báo. iPhone: cần cài app lên màn hình chính (iOS 16.4+).

**③ Đăng nhập khuôn mặt:**
- Nhận diện **100% trên thiết bị** (face-api ~6MB tải 1 lần, SW cache) — ảnh mặt không rời máy, chỉ lưu vector 128 số.
- 2 lớp so khớp: local (nhanh) → server `fn_dang_nhap_khuon_mat` xác nhận (ngưỡng 0.5) → cấp phiên.
- Sau đăng nhập mật khẩu đầu tiên, app mời kích hoạt 3 giây; bật/tắt trong Tài khoản. Lỗi model/camera → tự ẩn, mật khẩu không bị ảnh hưởng.

**④ Tóm tắt AI cuối ngày cho BQT:**
- Edge Function `daily-digest` 18:30 VN (T2–T7): gom vị trí, báo cáo, vấn đề, kỷ luật, kế hoạch mai → Claude viết "Tình hình vận hành hôm nay" ≤300 chữ → lưu + nhắc/push các ADMIN. Hiện đầu tab Quản trị.

**⑤ Dashboard tự cập nhật 30 giây** khi mở tab Tổng quan (tạm dừng khi màn hình ẩn hoặc đang mở sheet).

**File thay đổi (frontend):** `js/06-push.js` (mới), `js/07-face.js` (mới), `js/15-tab-congviec.js` (mới), `js/00-config.js`, `js/02-auth.js`, `js/03-ui.js`, `js/05-troly.js`, `js/13-tab-taikhoan.js`, `js/14-tab-quantri.js`, `js/99-app.js`, `sw.js`, `css/app.css`, `README.md`.
**SQL:** `UPDATE_v0.1.5.sql` — kèm bổ sung bảng `cong_viec_capnhat` bị thiếu từ schema gốc (test local phát hiện).
**Edge Functions:** dán lại `ai-gateway` (v3) + tạo mới `push-sender`, `daily-digest`.
**Secrets mới cần đặt:** `CRON_SECRET`, `VAPID_PUBLIC`, `VAPID_PRIVATE` (giá trị trong mục Triển khai bên dưới).
**Kiểm chứng:** 10/10 kịch bản SQL pass (routine chống trùng, mốc tự tính 50%, 360 đủ khóa, deadline nhắc, face khớp/từ chối, push RPC, digest). Toàn bộ JS pass syntax. ⚠️ Web Push và khuôn mặt cần Aroma test trên iPhone thật — 2 tính năng phụ thuộc thiết bị, code đã defensive (lỗi → tự ẩn, không phá luồng chính).

---

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

**v0.1.7 (dự kiến):** Trợ lý hỏi đáp sâu (*"tuần này phòng kho có vấn đề gì"*, *"việc X tới đâu rồi"* trả lời bằng dữ liệu thật, có RPC truy vấn tổng hợp) · tổng hợp tuần/tháng · biểu đồ hiệu suất người/phòng · xuất báo cáo Word trình TGĐ.
