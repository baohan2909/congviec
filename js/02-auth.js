// ============================================================
// CÔNG VIỆC — 02-auth.js
// Lần đầu: mã NV + mật khẩu · (Khuôn mặt: Patch 2, module riêng)
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, ic, toast, busy, openSheet, closeSheet } from './03-ui.js';
import { MC } from './00-config.js';

export function renderLogin(onOK) {
  const el = $('#screen-login');
  el.innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <div class="logo-mark">CV</div>
        <h1 class="login-title">Công việc</h1>
        <p class="login-sub">Hệ thống báo cáo &amp; quản trị công việc</p>
        <div class="card">
          <div class="field"><label>Mã nhân viên</label>
            <input class="input mono" id="lgMa" placeholder="NS00xxx" autocomplete="username" autocapitalize="characters"></div>
          <div class="field"><label>Mật khẩu</label>
            <input class="input" id="lgMk" type="password" autocomplete="current-password"></div>
          <button class="btn btn-gold" id="lgBtn">${ic('key')} Đăng nhập</button>
          <p class="muted mt" style="font-size:14px;text-align:center">
            Đăng nhập bằng khuôn mặt sẽ sẵn sàng ở bản cập nhật kế tiếp ạ.</p>
        </div>
      </div>
    </div>`;

  const go = () =>
    busy($('#lgBtn'), async () => {
      try {
        const data = await rpc('fn_dang_nhap', {
          p_ma_nv: $('#lgMa').value, p_mat_khau: $('#lgMk').value,
          p_thiet_bi: navigator.userAgent.slice(0, 120),
        }, false);
        phien.set(data);
        if (data.nguoi_dung.phai_doi_mat_khau) doiMatKhauLanDau(onOK);
        else onOK();
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  $('#lgBtn').onclick = go;
  $('#lgMk').onkeydown = (e) => e.key === 'Enter' && go();
}

function doiMatKhauLanDau(onOK) {
  const sh = openSheet(`
    <h3>${ic('key')} Đổi mật khẩu lần đầu</h3>
    <p class="muted">Vì an toàn, anh/chị đặt mật khẩu mới trước khi bắt đầu ạ.</p>
    <div class="field"><label>Mật khẩu hiện tại</label><input class="input" id="dmCu" type="password"></div>
    <div class="field"><label>Mật khẩu mới (≥ 6 ký tự)</label><input class="input" id="dmMoi" type="password"></div>
    <button class="btn btn-gold" id="dmBtn">${ic('check')} Lưu mật khẩu mới</button>`);
  $('#dmBtn', sh).onclick = () =>
    busy($('#dmBtn', sh), async () => {
      try {
        await rpc('fn_doi_mat_khau', { p_cu: $('#dmCu', sh).value, p_moi: $('#dmMoi', sh).value });
        const p = phien.get(); p.nguoi_dung.phai_doi_mat_khau = false; phien.set(p);
        closeSheet(); toast(MC.doiMkThanhCong); onOK();
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
}

export async function dangXuat() {
  try { await rpc('fn_dang_xuat'); } catch {}
  phien.clear();
  location.reload();
}
