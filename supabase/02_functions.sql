-- ============================================================
-- CÔNG VIỆC — 02_functions.sql  (chạy sau 01_schema.sql)
-- Mọi RPC đều SECURITY DEFINER + tự kiểm tra token phiên
-- ============================================================

-- ---------- HELPER: xác thực phiên ----------
create or replace function fn_phien(p_token uuid)
returns nguoi_dung
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung;
begin
  select nd.* into v_nd
  from phien_dang_nhap p
  join nguoi_dung nd on nd.ma_nv = p.ma_nv
  where p.token = p_token
    and p.het_han > now()
    and nd.trang_thai = 'HOAT_DONG';
  if not found then
    raise exception 'PHIEN_HET_HAN';
  end if;
  return v_nd;
end $$;

create or replace function fn_ngay_vn()
returns date language sql stable as
$$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- ---------- ĐĂNG NHẬP / PHIÊN ----------
create or replace function fn_dang_nhap(p_ma_nv text, p_mat_khau text, p_thiet_bi text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung; v_token uuid;
begin
  select * into v_nd from nguoi_dung
  where ma_nv = upper(trim(p_ma_nv)) and trang_thai <> 'DA_XOA';
  if not found or v_nd.mat_khau_hash <> crypt(p_mat_khau, v_nd.mat_khau_hash) then
    raise exception 'SAI_TAI_KHOAN';
  end if;
  if v_nd.trang_thai = 'TAM_KHOA' then
    raise exception 'TAI_KHOAN_KHOA';
  end if;

  insert into phien_dang_nhap (ma_nv, phuong_thuc, thiet_bi)
  values (v_nd.ma_nv, 'MAT_KHAU', p_thiet_bi)
  returning token into v_token;

  return jsonb_build_object(
    'token', v_token,
    'nguoi_dung', jsonb_build_object(
      'ma_nv', v_nd.ma_nv, 'ho_ten', v_nd.ho_ten, 'ten_goi', v_nd.ten_goi,
      'vai_tro', v_nd.vai_tro, 'ma_phong_ban', v_nd.ma_phong_ban,
      'phai_doi_mat_khau', v_nd.phai_doi_mat_khau
    )
  );
end $$;

create or replace function fn_dang_xuat(p_token uuid)
returns void language sql security definer set search_path = public as
$$ delete from phien_dang_nhap where token = p_token $$;

create or replace function fn_doi_mat_khau(p_token uuid, p_cu text, p_moi text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  if v_nd.mat_khau_hash <> crypt(p_cu, v_nd.mat_khau_hash) then
    raise exception 'SAI_MAT_KHAU_CU';
  end if;
  if length(p_moi) < 6 then raise exception 'MAT_KHAU_NGAN'; end if;
  update nguoi_dung
  set mat_khau_hash = crypt(p_moi, gen_salt('bf')),
      phai_doi_mat_khau = false, cap_nhat_luc = now()
  where ma_nv = v_nd.ma_nv;
end $$;

-- ---------- MÀN HÌNH HÔM NAY (1 call lấy tất cả) ----------
create or replace function fn_lay_hom_nay(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token); v_ngay date := fn_ngay_vn();
begin
  return jsonb_build_object(
    'ngay', v_ngay,
    'trang_thai_ds', (
      select coalesce(jsonb_agg(t order by t.thu_tu), '[]'::jsonb)
      from trang_thai_lamviec t where t.hien_thi
    ),
    'checkin', (
      select to_jsonb(c) from checkin_ngay c
      where c.ma_nv = v_nd.ma_nv and c.ngay = v_ngay
    ),
    'di_chuyen', (
      select coalesce(jsonb_agg(d order by d.gio), '[]'::jsonb)
      from di_chuyen d
      join checkin_ngay c on c.id = d.checkin_id
      where c.ma_nv = v_nd.ma_nv and c.ngay = v_ngay
    ),
    'bao_cao', (
      select to_jsonb(b) from bao_cao b
      where b.ma_nv = v_nd.ma_nv and b.ngay = v_ngay
      order by b.gui_luc desc limit 1
    ),
    'ke_hoach', (
      select coalesce(jsonb_agg(k order by k.thoi_gian), '[]'::jsonb)
      from ke_hoach k
      where k.ma_nv = v_nd.ma_nv and k.trang_thai = 'CHO'
        and (k.thoi_gian at time zone 'Asia/Ho_Chi_Minh')::date = v_ngay
    ),
    'nhac_viec', (
      select coalesce(jsonb_agg(n order by n.lich_gui desc), '[]'::jsonb)
      from nhac_viec n
      where n.ma_nv = v_nd.ma_nv and n.da_xem = false and n.lich_gui <= now()
    )
  );
end $$;

-- ---------- CHECK-IN ----------
create or replace function fn_checkin(p_token uuid, p_loai text, p_dia_diem text default null, p_ghi_chu text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token); v_row checkin_ngay;
        v_can boolean;
begin
  select can_dia_diem into v_can from trang_thai_lamviec where ma = p_loai and hien_thi;
  if not found then raise exception 'TRANG_THAI_KHONG_HOP_LE'; end if;
  if v_can and coalesce(trim(p_dia_diem),'') = '' then
    raise exception 'THIEU_DIA_DIEM';
  end if;

  insert into checkin_ngay (ma_nv, ngay, loai, dia_diem, ghi_chu)
  values (v_nd.ma_nv, fn_ngay_vn(), p_loai, nullif(trim(p_dia_diem),''), nullif(trim(p_ghi_chu),''))
  on conflict (ma_nv, ngay) do update
    set loai = excluded.loai, dia_diem = excluded.dia_diem,
        ghi_chu = excluded.ghi_chu, cap_nhat_luc = now()
  returning * into v_row;

  update nhac_viec set da_xem = true
  where ma_nv = v_nd.ma_nv and loai = 'CHECKIN' and da_xem = false;

  return to_jsonb(v_row);
end $$;

create or replace function fn_them_di_chuyen(p_token uuid, p_gio text, p_dia_diem text, p_ly_do text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token); v_cid bigint; v_row di_chuyen;
begin
  select id into v_cid from checkin_ngay
  where ma_nv = v_nd.ma_nv and ngay = fn_ngay_vn();
  if not found then raise exception 'CHUA_CHECKIN'; end if;

  insert into di_chuyen (checkin_id, gio, dia_diem, ly_do)
  values (v_cid, p_gio, trim(p_dia_diem), nullif(trim(p_ly_do),''))
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

-- ---------- BÁO CÁO ----------
create or replace function fn_gui_bao_cao(
  p_token uuid, p_noi_dung text, p_noi_dung_goc text default null,
  p_co_van_de boolean default false, p_audio_path text default null,
  p_anh jsonb default '[]'::jsonb)
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token); v_id bigint; v_a jsonb;
begin
  if coalesce(trim(p_noi_dung),'') = '' then raise exception 'BAO_CAO_TRONG'; end if;

  insert into bao_cao (ma_nv, ngay, noi_dung, noi_dung_goc, co_van_de, audio_path)
  values (v_nd.ma_nv, fn_ngay_vn(), trim(p_noi_dung), p_noi_dung_goc, p_co_van_de, p_audio_path)
  returning id into v_id;

  for v_a in select * from jsonb_array_elements(coalesce(p_anh,'[]'::jsonb)) loop
    insert into bao_cao_anh (bao_cao_id, storage_path, chu_thich, thu_tu)
    values (v_id, v_a->>'path', v_a->>'chu_thich', coalesce((v_a->>'thu_tu')::int,0));
  end loop;

  update nhac_viec set da_xem = true
  where ma_nv = v_nd.ma_nv and loai = 'BAO_CAO_NGAY' and da_xem = false;

  return v_id;
end $$;

create or replace function fn_ds_bao_cao(
  p_token uuid, p_tu date, p_den date,
  p_ma_nv text default null, p_chi_van_de boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  -- NHAN_VIEN chỉ xem của mình; TRUONG_BP xem phòng mình; ADMIN xem tất cả
  return (
    select coalesce(jsonb_agg(x order by x->>'gui_luc' desc), '[]'::jsonb) from (
      select to_jsonb(b) || jsonb_build_object(
        'ho_ten', nd.ho_ten, 'ten_goi', nd.ten_goi, 'ma_phong_ban', nd.ma_phong_ban,
        'anh', (select coalesce(jsonb_agg(a order by a.thu_tu),'[]'::jsonb)
                from bao_cao_anh a where a.bao_cao_id = b.id)
      ) as x
      from bao_cao b join nguoi_dung nd on nd.ma_nv = b.ma_nv
      where b.ngay between p_tu and p_den
        and (not p_chi_van_de or b.co_van_de)
        and (p_ma_nv is null or b.ma_nv = p_ma_nv)
        and (
          v_nd.vai_tro = 'ADMIN'
          or (v_nd.vai_tro = 'TRUONG_BP' and nd.ma_phong_ban = v_nd.ma_phong_ban)
          or b.ma_nv = v_nd.ma_nv
        )
    ) s
  );
end $$;

-- ---------- KẾ HOẠCH ----------
create or replace function fn_tao_ke_hoach(
  p_token uuid, p_tieu_de text, p_thoi_gian timestamptz,
  p_mo_ta text default null, p_dia_diem text default null,
  p_nhac_truoc_phut int default 30, p_nguon text default 'TU_TAO')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token); v_row ke_hoach;
begin
  insert into ke_hoach (ma_nv, tieu_de, mo_ta, thoi_gian, dia_diem, nhac_truoc_phut, nguon)
  values (v_nd.ma_nv, trim(p_tieu_de), p_mo_ta, p_thoi_gian, p_dia_diem,
          coalesce(p_nhac_truoc_phut,30), p_nguon)
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_ds_ke_hoach(p_token uuid, p_tu date, p_den date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  return (
    select coalesce(jsonb_agg(to_jsonb(k) order by k.thoi_gian), '[]'::jsonb)
    from ke_hoach k
    where k.ma_nv = v_nd.ma_nv
      and (k.thoi_gian at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
  );
end $$;

create or replace function fn_cap_nhat_ke_hoach(p_token uuid, p_id bigint, p_trang_thai text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  update ke_hoach set trang_thai = p_trang_thai
  where id = p_id and ma_nv = v_nd.ma_nv;
  if not found then raise exception 'KHONG_TIM_THAY'; end if;
end $$;

-- ---------- NHẮC VIỆC ----------
create or replace function fn_da_xem_nhac(p_token uuid, p_id bigint default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  update nhac_viec set da_xem = true
  where ma_nv = v_nd.ma_nv and (p_id is null or id = p_id);
end $$;

-- ---------- TRỢ LÝ AI ----------
create or replace function fn_xac_nhan_tro_ly(p_token uuid, p_luot_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  update tro_ly_luot set da_xac_nhan = true
  where id = p_luot_id and ma_nv = v_nd.ma_nv;
end $$;

-- ---------- QUẢN TRỊ (ADMIN) ----------
create or replace function fn_admin_check(p_token uuid)
returns nguoi_dung
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  if v_nd.vai_tro <> 'ADMIN' then raise exception 'KHONG_CO_QUYEN'; end if;
  return v_nd;
end $$;

create or replace function fn_admin_ds_nguoi_dung(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_admin_check(p_token);
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'ma_nv', n.ma_nv, 'ho_ten', n.ho_ten, 'ten_goi', n.ten_goi,
      'ma_phong_ban', n.ma_phong_ban, 'ten_pb', pb.ten_pb,
      'vai_tro', n.vai_tro, 'trang_thai', n.trang_thai, 'tao_luc', n.tao_luc
    ) order by n.ma_nv), '[]'::jsonb)
    from nguoi_dung n left join phong_ban pb on pb.ma_pb = n.ma_phong_ban
    where n.trang_thai <> 'DA_XOA'
  );
end $$;

create or replace function fn_admin_ds_phong_ban(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_phien(p_token);
begin
  return (select coalesce(jsonb_agg(to_jsonb(p) order by p.ma_pb),'[]'::jsonb) from phong_ban p);
end $$;

create or replace function fn_admin_tao_phong_ban(p_token uuid, p_ma_pb text, p_ten_pb text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_admin_check(p_token);
begin
  insert into phong_ban (ma_pb, ten_pb) values (upper(trim(p_ma_pb)), trim(p_ten_pb))
  on conflict (ma_pb) do update set ten_pb = excluded.ten_pb;
end $$;

create or replace function fn_admin_tao_nguoi_dung(
  p_token uuid, p_ma_nv text, p_ho_ten text, p_ten_goi text,
  p_ma_pb text, p_vai_tro text, p_mat_khau text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_admin_check(p_token);
begin
  if length(coalesce(p_mat_khau,'')) < 6 then raise exception 'MAT_KHAU_NGAN'; end if;
  insert into nguoi_dung (ma_nv, ho_ten, ten_goi, ma_phong_ban, vai_tro, mat_khau_hash, tao_boi)
  values (upper(trim(p_ma_nv)), trim(p_ho_ten), trim(p_ten_goi),
          nullif(p_ma_pb,''), p_vai_tro, crypt(p_mat_khau, gen_salt('bf')), v_nd.ma_nv);
end $$;

create or replace function fn_admin_cap_nhat_nguoi_dung(p_token uuid, p_ma_nv text, p_thay_doi jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_admin_check(p_token);
begin
  update nguoi_dung set
    ho_ten       = coalesce(p_thay_doi->>'ho_ten', ho_ten),
    ten_goi      = coalesce(p_thay_doi->>'ten_goi', ten_goi),
    ma_phong_ban = coalesce(nullif(p_thay_doi->>'ma_phong_ban',''), ma_phong_ban),
    vai_tro      = coalesce(p_thay_doi->>'vai_tro', vai_tro),
    trang_thai   = coalesce(p_thay_doi->>'trang_thai', trang_thai),
    mat_khau_hash = case
      when coalesce(p_thay_doi->>'mat_khau_moi','') <> ''
      then crypt(p_thay_doi->>'mat_khau_moi', gen_salt('bf'))
      else mat_khau_hash end,
    phai_doi_mat_khau = case
      when coalesce(p_thay_doi->>'mat_khau_moi','') <> '' then true
      else phai_doi_mat_khau end,
    cap_nhat_luc = now()
  where ma_nv = upper(trim(p_ma_nv));
  if not found then raise exception 'KHONG_TIM_THAY'; end if;
  -- khóa tài khoản → hủy mọi phiên
  if p_thay_doi->>'trang_thai' in ('TAM_KHOA','DA_XOA') then
    delete from phien_dang_nhap where ma_nv = upper(trim(p_ma_nv));
  end if;
end $$;

-- ---------- DASHBOARD BAN QUẢN TRỊ ----------
create or replace function fn_bqt_homnay(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nd nguoi_dung := fn_admin_check(p_token); v_ngay date := fn_ngay_vn();
begin
  return jsonb_build_object(
    'ngay', v_ngay,
    'nhan_su', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ma_nv', n.ma_nv, 'ho_ten', n.ho_ten, 'ten_pb', pb.ten_pb,
        'loai', c.loai, 'ten_loai', t.ten, 'dia_diem', c.dia_diem,
        'di_chuyen', (select coalesce(jsonb_agg(d order by d.gio),'[]'::jsonb)
                      from di_chuyen d where d.checkin_id = c.id),
        'da_bao_cao', exists(select 1 from bao_cao b where b.ma_nv=n.ma_nv and b.ngay=v_ngay)
      ) order by n.ho_ten), '[]'::jsonb)
      from nguoi_dung n
      left join phong_ban pb on pb.ma_pb = n.ma_phong_ban
      left join checkin_ngay c on c.ma_nv = n.ma_nv and c.ngay = v_ngay
      left join trang_thai_lamviec t on t.ma = c.loai
      where n.trang_thai = 'HOAT_DONG'
    ),
    'bao_cao_moi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'ma_nv', b.ma_nv, 'ho_ten', nd.ho_ten,
        'noi_dung', b.noi_dung, 'co_van_de', b.co_van_de, 'gui_luc', b.gui_luc,
        'so_anh', (select count(*) from bao_cao_anh a where a.bao_cao_id=b.id)
      ) order by b.co_van_de desc, b.gui_luc desc), '[]'::jsonb)
      from bao_cao b join nguoi_dung nd on nd.ma_nv = b.ma_nv
      where b.ngay = v_ngay
    )
  );
end $$;

-- ============================================================
-- QUYỀN THỰC THI: chỉ mở đúng các RPC cho anon
-- ============================================================
revoke all on all functions in schema public from public, anon;
grant execute on function
  fn_dang_nhap(text,text,text), fn_dang_xuat(uuid),
  fn_doi_mat_khau(uuid,text,text), fn_lay_hom_nay(uuid),
  fn_checkin(uuid,text,text,text), fn_them_di_chuyen(uuid,text,text,text),
  fn_gui_bao_cao(uuid,text,text,boolean,text,jsonb),
  fn_ds_bao_cao(uuid,date,date,text,boolean),
  fn_tao_ke_hoach(uuid,text,timestamptz,text,text,int,text),
  fn_ds_ke_hoach(uuid,date,date), fn_cap_nhat_ke_hoach(uuid,bigint,text),
  fn_da_xem_nhac(uuid,bigint), fn_xac_nhan_tro_ly(uuid,bigint),
  fn_admin_ds_nguoi_dung(uuid), fn_admin_ds_phong_ban(uuid),
  fn_admin_tao_phong_ban(uuid,text,text),
  fn_admin_tao_nguoi_dung(uuid,text,text,text,text,text,text),
  fn_admin_cap_nhat_nguoi_dung(uuid,text,jsonb),
  fn_bqt_homnay(uuid)
to anon;
