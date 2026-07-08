// ============================================================
// CÔNG VIỆC — 13-tab-taikhoan.js
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, ic, esc, toast, openSheet, closeSheet, busy } from './03-ui.js';
import { MC, SYS } from './00-config.js';
import { dangXuat } from './02-auth.js';

const TEN_VT = { ADMIN: 'Quản trị viên', TRUONG_BP: 'Trưởng bộ phận', NHAN_VIEN: 'Thành viên' };

export function renderTaiKhoan(root) {
  const nd = phien.nd();
  const initials = nd.ho_ten.trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase();
  const theme = document.documentElement.dataset.theme || 'light';

  root.innerHTML = `
    <div class="page-head"><div>
      <h1 class="page-title">Tài khoản</h1>
      <p class="page-sub">Cài đặt cá nhân của ${esc(nd.ten_goi)}</p></div>
    </div>

    <div class="card">
      <div class="row">
        <div class="avatar" style="width:56px;height:56px;font-size:19px">${esc(initials)}</div>
        <div class="list-main">
          <div class="list-title" style="font-size:18px">${esc(nd.ho_ten)}</div>
          <div class="list-sub mono">${esc(nd.ma_nv)} · ${TEN_VT[nd.vai_tro] || nd.vai_tro}</div>
        </div>
        <span class="badge badge-brand">Nón Sơn</span>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">${ic('sun')} Giao diện</h2>
      <div class="row">
        <button class="btn ${theme === 'light' ? 'btn-primary' : 'btn-quiet'}" data-th="light">${ic('sun')} Sáng</button>
        <button class="btn ${theme === 'dark' ? 'btn-primary' : 'btn-quiet'}" data-th="dark">${ic('moon')} Tối</button>
      </div>
      <p class="muted mt mb0" style="font-size:14px">Nền sáng giúp đọc dễ hơn; nền tối hợp buổi đêm ạ.</p>
    </div>

    <div class="card">
      <h2 class="card-title">${ic('key')} Bảo mật</h2>
      <button class="btn btn-quiet" id="tkDoiMk">${ic('key')} Đổi mật khẩu</button>
      <button class="btn btn-quiet mt" disabled>${ic('eye')} Đăng nhập khuôn mặt — bản cập nhật kế tiếp</button>
    </div>

    <button class="btn btn-danger" id="tkOut">${ic('out')} Đăng xuất</button>
    <p class="muted mono mt" style="text-align:center;font-size:12px">Công việc · v${SYS.version}</p>`;

  root.querySelectorAll('[data-th]').forEach((b) => b.onclick = () => {
    const th = b.dataset.th;
    document.documentElement.dataset.theme = th;
    localStorage.setItem('cv_theme', th);
    document.querySelector('meta[name=theme-color]')
      ?.setAttribute('content', th === 'dark' ? '#050B1F' : '#EEF3FA');
    renderTaiKhoan(root);
  });

  $('#tkDoiMk', root).onclick = () => {
    const sh = openSheet(`
      <h3>${ic('key')} Đổi mật khẩu</h3>
      <div class="field"><label>Mật khẩu hiện tại</label><input class="input" id="mk1" type="password"></div>
      <div class="field"><label>Mật khẩu mới (≥ 6 ký tự)</label><input class="input" id="mk2" type="password"></div>
      <button class="btn btn-primary" id="mkOK">${ic('check')} Lưu mật khẩu mới</button>`);
    $('#mkOK', sh).onclick = () => busy($('#mkOK', sh), async () => {
      try {
        await rpc('fn_doi_mat_khau', { p_cu: $('#mk1', sh).value, p_moi: $('#mk2', sh).value });
        closeSheet(); toast(MC.doiMkThanhCong);
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  };

  $('#tkOut', root).onclick = () => {
    const sh = openSheet(`
      <h3>${ic('out')} Đăng xuất</h3>
      <p class="muted">Anh/chị muốn đăng xuất khỏi thiết bị này phải không ạ?</p>
      <div class="row mt">
        <button class="btn btn-quiet" id="outNo">Ở lại</button>
        <button class="btn btn-danger" id="outYes">${ic('out')} Đăng xuất</button>
      </div>`);
    $('#outNo', sh).onclick = closeSheet;
    $('#outYes', sh).onclick = dangXuat;
  };
}
