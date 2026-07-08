-- Patch 01 → v0.1.1
update app_settings set gia_tri = '0.1.1', cap_nhat_luc = now()
where khoa = 'cache_version';
