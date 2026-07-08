-- ============================================================
-- CÔNG VIỆC — 04_storage.sql  (chạy sau 03)
-- Bucket ảnh + ghi âm báo cáo
-- ============================================================
insert into storage.buckets (id, name, public)
values ('bao-cao', 'bao-cao', true)
on conflict (id) do nothing;

-- Cho phép app (anon key) tải lên; đọc công khai qua public URL
create policy "cv_baocao_upload"
  on storage.objects for insert to anon
  with check (bucket_id = 'bao-cao');

create policy "cv_baocao_read"
  on storage.objects for select to anon
  using (bucket_id = 'bao-cao');
