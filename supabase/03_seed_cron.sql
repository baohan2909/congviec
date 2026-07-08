-- ============================================================
-- CÔNG VIỆC — 03_seed_cron.sql  (chạy sau 02_functions.sql)
-- ============================================================

-- ---------- PHÒNG BAN MẪU (Admin sửa/thêm trong app) ----------
insert into phong_ban (ma_pb, ten_pb) values
  ('BGD', 'Ban Giám đốc'),
  ('BQL', 'Ban Quản lý'),
  ('IT',  'Công nghệ thông tin')
on conflict (ma_pb) do nothing;

-- ---------- TÀI KHOẢN ADMIN ĐẦU TIÊN ----------
-- Mật khẩu tạm: Congviec@2026  → hệ thống bắt đổi ngay lần đăng nhập đầu
insert into nguoi_dung (ma_nv, ho_ten, ten_goi, ma_phong_ban, vai_tro, mat_khau_hash, phai_doi_mat_khau)
values ('NS00490', 'Aroma', 'anh Aroma', 'IT', 'ADMIN',
        crypt('Congviec@2026', gen_salt('bf')), true)
on conflict (ma_nv) do nothing;

-- ============================================================
-- PG_CRON — bật extension trước:
-- Dashboard → Database → Extensions → bật "pg_cron"
-- Lưu ý múi giờ: cron chạy theo UTC. Giờ VN = UTC+7.
-- ============================================================
create extension if not exists pg_cron;

-- ---------- Hàm sinh nhắc việc ----------
create or replace function job_sinh_nhac_ke_hoach()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Kế hoạch sắp đến giờ (trong cửa sổ nhac_truoc_phut)
  insert into nhac_viec (ma_nv, loai, noi_dung, lich_gui, lien_ket_id)
  select k.ma_nv, 'KE_HOACH',
         'Em nhắc nhẹ: ' || to_char(k.thoi_gian at time zone 'Asia/Ho_Chi_Minh','HH24:MI')
         || ' hôm nay có lịch «' || k.tieu_de || '»'
         || coalesce(' tại ' || k.dia_diem, '') || ' ạ.',
         now(), k.id
  from ke_hoach k
  where k.trang_thai = 'CHO' and k.da_sinh_nhac = false
    and k.thoi_gian - make_interval(mins => k.nhac_truoc_phut) <= now()
    and k.thoi_gian > now() - interval '2 hours';
  update ke_hoach set da_sinh_nhac = true
  where trang_thai='CHO' and da_sinh_nhac=false
    and thoi_gian - make_interval(mins => nhac_truoc_phut) <= now()
    and thoi_gian > now() - interval '2 hours';

  -- Kế hoạch quá hạn chưa xác nhận thực hiện
  insert into nhac_viec (ma_nv, loai, noi_dung, lich_gui, lien_ket_id)
  select k.ma_nv, 'QUA_HAN',
         'Kế hoạch «' || k.tieu_de || '» đã qua giờ dự kiến. Anh/chị xác nhận giúp em đã thực hiện chưa ạ.',
         now(), k.id
  from ke_hoach k
  where k.trang_thai = 'CHO'
    and k.thoi_gian < now() - interval '2 hours'
    and not exists (
      select 1 from nhac_viec n
      where n.lien_ket_id = k.id and n.loai='QUA_HAN'
        and n.tao_luc > now() - interval '20 hours'
    );
end $$;

create or replace function job_nhac_checkin()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into nhac_viec (ma_nv, loai, noi_dung, lich_gui)
  select n.ma_nv, 'CHECKIN',
         'Em chúc ' || n.ten_goi || ' buổi sáng tốt lành. '
         || 'Anh/chị cho em biết hôm nay làm việc ở đâu để em ghi nhận nhé ạ.',
         now()
  from nguoi_dung n
  where n.trang_thai = 'HOAT_DONG'
    and not exists (select 1 from checkin_ngay c
                    where c.ma_nv = n.ma_nv and c.ngay = fn_ngay_vn())
    and not exists (select 1 from nhac_viec x
                    where x.ma_nv = n.ma_nv and x.loai='CHECKIN'
                      and x.tao_luc::date = current_date);
end $$;

create or replace function job_nhac_bao_cao()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into nhac_viec (ma_nv, loai, noi_dung, lich_gui)
  select n.ma_nv, 'BAO_CAO_NGAY',
         'Cuối ngày rồi ạ. ' || n.ten_goi
         || ' bấm vào mic, nói vài câu là em soạn báo cáo hôm nay giúp mình ngay ạ.',
         now()
  from nguoi_dung n
  where n.trang_thai = 'HOAT_DONG'
    and not exists (select 1 from bao_cao b
                    where b.ma_nv = n.ma_nv and b.ngay = fn_ngay_vn())
    and not exists (select 1 from nhac_viec x
                    where x.ma_nv = n.ma_nv and x.loai='BAO_CAO_NGAY'
                      and x.tao_luc::date = current_date);
end $$;

-- ---------- Đăng ký lịch (UTC) ----------
select cron.schedule('cv-nhac-kehoach', '*/10 * * * *', $$select job_sinh_nhac_ke_hoach()$$);
select cron.schedule('cv-nhac-checkin', '0 2 * * 1-6',  $$select job_nhac_checkin()$$);   -- 9:00 VN, T2–T7
select cron.schedule('cv-nhac-baocao',  '0 10 * * 1-6', $$select job_nhac_bao_cao()$$);   -- 17:00 VN, T2–T7
