-- ============================================================
-- CÔNG VIỆC — 01_schema.sql  (chạy đầu tiên trong SQL Editor)
-- Supabase Pro · Region Sydney · v0.1.0
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- CẤU HÌNH HỆ THỐNG ----------
create table if not exists app_settings (
  khoa        text primary key,
  gia_tri     text not null,
  cap_nhat_luc timestamptz default now()
);

insert into app_settings (khoa, gia_tri) values
  ('cache_version', '0.1.0'),
  ('model_troly',   'claude-haiku-4-5'),
  ('model_tonghop', 'claude-sonnet-4-6')
on conflict (khoa) do nothing;

-- ---------- ĐỊNH DANH ----------
create table if not exists phong_ban (
  ma_pb    text primary key,
  ten_pb   text not null,
  truong_pb text,
  tao_luc  timestamptz default now()
);

create table if not exists nguoi_dung (
  ma_nv            text primary key,           -- chuẩn NSxxxxx
  ho_ten           text not null,
  ten_goi          text not null,              -- "anh Tuấn", "chị Linh"
  ma_phong_ban     text references phong_ban(ma_pb),
  vai_tro          text not null default 'NHAN_VIEN'
                   check (vai_tro in ('ADMIN','TRUONG_BP','NHAN_VIEN')),
  mat_khau_hash    text not null,
  phai_doi_mat_khau boolean default true,
  face_embedding   jsonb,                      -- vector khuôn mặt (Patch 2)
  push_subscription jsonb,                     -- Web Push (Patch 2)
  quyen_mo_rong    jsonb default '{}'::jsonb,  -- ABAC về sau
  trang_thai       text not null default 'HOAT_DONG'
                   check (trang_thai in ('HOAT_DONG','TAM_KHOA','DA_XOA')),
  tao_boi          text,
  tao_luc          timestamptz default now(),
  cap_nhat_luc     timestamptz default now()
);

create table if not exists phien_dang_nhap (
  token       uuid primary key default gen_random_uuid(),
  ma_nv       text not null references nguoi_dung(ma_nv),
  phuong_thuc text not null default 'MAT_KHAU'
              check (phuong_thuc in ('MAT_KHAU','KHUON_MAT')),
  thiet_bi    text,
  het_han     timestamptz not null default now() + interval '30 days',
  tao_luc     timestamptz default now()
);
create index if not exists idx_phien_manv on phien_dang_nhap(ma_nv);

-- ---------- CHECK-IN & DI CHUYỂN ----------
create table if not exists trang_thai_lamviec (
  ma           text primary key,
  ten          text not null,
  can_dia_diem boolean default false,
  icon         text default 'briefcase',
  thu_tu       int default 0,
  hien_thi     boolean default true
);

insert into trang_thai_lamviec (ma, ten, can_dia_diem, icon, thu_tu) values
  ('VAN_PHONG', 'Làm việc tại văn phòng', false, 'building', 1),
  ('LAM_O_NHA', 'Làm việc tại nhà',        false, 'home',     2),
  ('CONG_TAC',  'Công tác',                true,  'car',      3),
  ('NGHI_PHEP', 'Nghỉ phép',               false, 'leaf',     4)
on conflict (ma) do nothing;

create table if not exists checkin_ngay (
  id        bigint generated always as identity primary key,
  ma_nv     text not null references nguoi_dung(ma_nv),
  ngay      date not null,
  loai      text not null references trang_thai_lamviec(ma),
  dia_diem  text,
  ghi_chu   text,
  tao_luc   timestamptz default now(),
  cap_nhat_luc timestamptz default now(),
  unique (ma_nv, ngay)
);

create table if not exists di_chuyen (
  id         bigint generated always as identity primary key,
  checkin_id bigint not null references checkin_ngay(id) on delete cascade,
  gio        text not null,            -- "14:00"
  dia_diem   text not null,
  ly_do      text,
  tao_luc    timestamptz default now()
);

-- ---------- BÁO CÁO ----------
create table if not exists bao_cao (
  id            bigint generated always as identity primary key,
  ma_nv         text not null references nguoi_dung(ma_nv),
  ngay          date not null,
  noi_dung_goc  text,                  -- văn bản thô từ giọng nói
  noi_dung      text not null,         -- bản đã chuẩn hóa
  co_van_de     boolean default false,
  audio_path    text,                  -- file ghi âm gốc trong Storage
  trang_thai    text not null default 'DA_GUI'
                check (trang_thai in ('NHAP','DA_GUI','DA_XEM')),
  gui_luc       timestamptz default now()
);
create index if not exists idx_baocao_ngay on bao_cao(ngay desc);
create index if not exists idx_baocao_manv on bao_cao(ma_nv, ngay desc);

create table if not exists bao_cao_anh (
  id          bigint generated always as identity primary key,
  bao_cao_id  bigint not null references bao_cao(id) on delete cascade,
  storage_path text not null,
  chu_thich   text,
  thu_tu      int default 0
);

-- ---------- CÔNG VIỆC & KẾ HOẠCH ----------
create table if not exists hang_muc (
  id        bigint generated always as identity primary key,
  ten       text not null,
  mo_ta     text,
  nguoi_tao text references nguoi_dung(ma_nv),
  trang_thai text default 'MO' check (trang_thai in ('MO','DONG')),
  tao_luc   timestamptz default now()
);

create table if not exists cong_viec (
  id          bigint generated always as identity primary key,
  hang_muc_id bigint references hang_muc(id),
  tieu_de     text not null,
  mo_ta       text,
  giao_cho    text not null,           -- ma_nv hoặc ma_pb
  deadline    timestamptz,
  uu_tien     text default 'BINH_THUONG'
              check (uu_tien in ('THAP','BINH_THUONG','CAO','KHAN')),
  trang_thai  text default 'CHUA_LAM'
              check (trang_thai in ('CHUA_LAM','DANG_LAM','CHO_DUYET','HOAN_THANH','VUONG_MAC')),
  tien_do     int default 0 check (tien_do between 0 and 100),
  nguon       text default 'ADMIN_GIAO' check (nguon in ('ADMIN_GIAO','AI_TRICH')),
  nguoi_tao   text references nguoi_dung(ma_nv),
  tao_luc     timestamptz default now(),
  cap_nhat_luc timestamptz default now()
);

create table if not exists ke_hoach (
  id             bigint generated always as identity primary key,
  ma_nv          text not null references nguoi_dung(ma_nv),
  tieu_de        text not null,
  mo_ta          text,
  thoi_gian      timestamptz not null,
  dia_diem       text,
  nhac_truoc_phut int default 30,
  trang_thai     text default 'CHO'
                 check (trang_thai in ('CHO','DA_THUC_HIEN','DA_HUY')),
  nguon          text default 'TU_TAO' check (nguon in ('TU_TAO','AI_TRICH')),
  da_sinh_nhac   boolean default false,
  tao_luc        timestamptz default now()
);
create index if not exists idx_kehoach_manv on ke_hoach(ma_nv, thoi_gian);

create table if not exists nhac_viec (
  id         bigint generated always as identity primary key,
  ma_nv      text not null references nguoi_dung(ma_nv),
  loai       text not null
             check (loai in ('KE_HOACH','BAO_CAO_NGAY','CHECKIN','DEADLINE','QUA_HAN','KHAC')),
  noi_dung   text not null,
  lich_gui   timestamptz not null,
  da_gui     boolean default false,    -- đã đẩy push (Patch 2)
  da_xem     boolean default false,    -- đã hiển thị trong app
  lien_ket_id bigint,
  tao_luc    timestamptz default now()
);
create index if not exists idx_nhac_manv on nhac_viec(ma_nv, da_xem, lich_gui);

-- ---------- NHẬT KÝ TRỢ LÝ AI ----------
create table if not exists tro_ly_luot (
  id                 bigint generated always as identity primary key,
  ma_nv              text not null references nguoi_dung(ma_nv),
  che_do             text default 'troly',
  noi_dung_nguoi_dung text not null,
  cong_cu_goi        jsonb,            -- các tool_use Claude trả về
  van_ban_tra_loi    text,
  da_xac_nhan        boolean default false,
  model              text,
  token_vao          int default 0,
  token_ra           int default 0,
  tao_luc            timestamptz default now()
);
create index if not exists idx_troly_manv on tro_ly_luot(ma_nv, tao_luc desc);

-- ============================================================
-- RLS: BẬT TRÊN MỌI BẢNG, KHÔNG CẤP POLICY CHO anon
-- → mọi truy cập dữ liệu bắt buộc đi qua RPC SECURITY DEFINER
--   (định nghĩa trong 02_functions.sql, tự kiểm tra token phiên)
-- ============================================================
alter table app_settings        enable row level security;
alter table phong_ban           enable row level security;
alter table nguoi_dung          enable row level security;
alter table phien_dang_nhap     enable row level security;
alter table trang_thai_lamviec  enable row level security;
alter table checkin_ngay        enable row level security;
alter table di_chuyen           enable row level security;
alter table bao_cao             enable row level security;
alter table bao_cao_anh         enable row level security;
alter table hang_muc            enable row level security;
alter table cong_viec           enable row level security;
alter table ke_hoach            enable row level security;
alter table nhac_viec           enable row level security;
alter table tro_ly_luot         enable row level security;
