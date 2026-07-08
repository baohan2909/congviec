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


# Patch 02 → v0.1.2

**Nội dung:** Điền sẵn `SUPA_URL` + `SUPA_ANON` vào cấu hình để đăng nhập được ngay.

## Cách cập nhật

1. Giải nén → đè lên repo `congviec` như thường lệ.
2. Push lên GitHub Pages.
3. Chạy SQL trong `BUMP_v0.1.2.sql`:
   ```sql
   update app_settings set gia_tri = '0.1.2', cap_nhat_luc = now()
   where khoa = 'cache_version';
   ```
4. Trên iPhone: vuốt tắt hẳn app → mở lại → đăng nhập bằng `NS00490 / Congviec@2026`.

## Sau khi đăng nhập được — hoàn tất 2 bước còn lại cho AI

**Bước A — Deploy Edge Function `ai-gateway`:**
Supabase Dashboard → Edge Functions → Deploy a new function → tên `ai-gateway` → dán nguyên nội dung file `supabase/functions/ai-gateway/index.ts` (đã có trong bản gốc v0.1.0) → Deploy.

**Bước B — Cắm key Claude:**
Edge Functions → Secrets → Add: `ANTHROPIC_API_KEY` = `sk-ant-...` của anh.

Xong 2 bước này, trợ lý AI sẽ hoạt động ở tab Hôm nay / Báo cáo / Kế hoạch.

## File thay đổi

| File | Sửa gì |
|---|---|
| `js/00-config.js` | Điền URL + anon key, bump version 0.1.2 |
| `sw.js` | Bump CACHE_VERSION |
| `BUMP_v0.1.2.sql` | Đồng bộ app_settings |
