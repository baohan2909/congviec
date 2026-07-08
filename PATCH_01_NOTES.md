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
