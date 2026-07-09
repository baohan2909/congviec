// ============================================================
// CÔNG VIỆC — 02-auth.js
// Lần đầu: mã NV + mật khẩu · (Khuôn mặt: Patch 2, module riêng)
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, ic, toast, busy, openSheet, closeSheet } from './03-ui.js';
import { MC, SYS } from './00-config.js';
import { faceLocal, dangNhapKhuonMat, dangKyKhuonMat, preloadFaceModel } from './07-face.js';

export function renderLogin(onOK) {
  const el = $('#screen-login');
  el.innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <div class="logo-mark">CV</div>
        <h1 class="login-title">Công việc</h1>
        <p class="login-sub">Hệ thống báo cáo &amp; quản trị công việc</p>
        <div class="card">
          <div id="lgFaceBox" class="hidden" style="margin-bottom:14px">
            <button class="btn btn-primary" id="lgFace" type="button">${ic('scan')} Đăng nhập bằng khuôn mặt</button>
            <div class="row" style="justify-content:center;margin:12px 0 2px">
              <span class="muted" style="font-size:13px">hoặc dùng mật khẩu</span>
            </div>
          </div>
          <form id="lgForm" autocomplete="on" novalidate>
            <div class="field"><label for="lgMa">Mã nhân viên</label>
              <input class="input mono" id="lgMa" name="username" type="text"
                     autocomplete="username" autocapitalize="characters"
                     autocorrect="off" spellcheck="false" placeholder="NS00xxx"></div>
            <div class="field"><label for="lgMk">Mật khẩu</label>
              <div class="pw-wrap">
                <input class="input" id="lgMk" name="password" type="password"
                       autocomplete="current-password" autocapitalize="none"
                       autocorrect="off" spellcheck="false">
                <button type="button" class="pw-eye" id="lgEye" aria-label="Hiện mật khẩu">${ic('eye')}</button>
              </div>
            </div>
            <button class="btn btn-primary" id="lgBtn" type="submit">${ic('key')} Đăng nhập</button>
          </form>
          <p class="muted mt" style="font-size:14px;text-align:center">
            Đăng nhập bằng khuôn mặt sẽ sẵn sàng ở bản cập nhật kế tiếp ạ.</p>
        </div>
        <p class="mono muted" style="text-align:center;font-size:12px;margin-top:14px;letter-spacing:.04em">
          Công việc · v${SYS.version}</p>
      </div>
    </div>`;

  // Đăng nhập khuôn mặt (nếu máy này đã đăng ký)
  const fl = faceLocal();
  if (fl) {
    preloadFaceModel(); // tải model song song để bấm nút là camera bật ngay

    $('#lgFaceBox').classList.remove('hidden');
    $('#lgMa').value = fl.ma_nv;
    $('#lgFace').onclick = async () => {
      const data = await dangNhapKhuonMat();
      if (!data) return;
      phien.set(data);
      if (data.nguoi_dung.phai_doi_mat_khau) doiMatKhauLanDau(onOK);
      else onOK();
    };
  }

  // Hiện/ẩn mật khẩu
  $('#lgEye').onclick = () => {
    const inp = $('#lgMk');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#lgEye').setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    $('#lgEye').classList.toggle('on', show);
    inp.focus();
  };

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

  // Submit qua form → iOS hiểu là đăng nhập, phím Enter/Go cũng chạy
  $('#lgForm').onsubmit = (e) => { e.preventDefault(); go(); };
}

function doiMatKhauLanDau(onOK) {
  const sh = openSheet(`
    <h3>${ic('key')} Đổi mật khẩu lần đầu</h3>
    <p class="muted">Vì an toàn, anh/chị đặt mật khẩu mới trước khi bắt đầu ạ.</p>
    <form id="dmForm" autocomplete="on" novalidate>
      <input type="text" name="username" autocomplete="username" value="${phien.nd()?.ma_nv || ''}" hidden>
      <div class="field"><label>Mật khẩu hiện tại</label>
        <div class="pw-wrap">
          <input class="input" id="dmCu" type="password" autocomplete="current-password" autocapitalize="none">
          <button type="button" class="pw-eye" data-for="dmCu" aria-label="Hiện mật khẩu">${ic('eye')}</button>
        </div></div>
      <div class="field"><label>Mật khẩu mới (≥ 6 ký tự)</label>
        <div class="pw-wrap">
          <input class="input" id="dmMoi" type="password" autocomplete="new-password" autocapitalize="none">
          <button type="button" class="pw-eye" data-for="dmMoi" aria-label="Hiện mật khẩu">${ic('eye')}</button>
        </div></div>
      <button class="btn btn-primary" id="dmBtn" type="submit">${ic('check')} Lưu mật khẩu mới</button>
    </form>`);

  sh.querySelectorAll('.pw-eye[data-for]').forEach((b) => b.onclick = () => {
    const inp = $('#' + b.dataset.for, sh);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.classList.toggle('on', show);
    inp.focus();
  });

  const save = () =>
    busy($('#dmBtn', sh), async () => {
      try {
        await rpc('fn_doi_mat_khau', { p_cu: $('#dmCu', sh).value, p_moi: $('#dmMoi', sh).value });
        const p = phien.get(); p.nguoi_dung.phai_doi_mat_khau = false; phien.set(p);
        closeSheet(); toast(MC.doiMkThanhCong); onOK();
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  $('#dmForm', sh).onsubmit = (e) => { e.preventDefault(); save(); };
}

export async function dangXuat() {
  // Phản hồi ngay — không để server làm chậm. Báo server tối đa 700ms rồi thoát.
  await Promise.race([
    rpc('fn_dang_xuat').catch(() => {}),
    new Promise((r) => setTimeout(r, 700)),
  ]);
  phien.clear();
  location.reload();
}


function goiYFace(onOK) {
  const sh = openSheet(`
    <h3>${ic('scan')} Đăng nhập bằng khuôn mặt</h3>
    <p class="muted">Từ lần sau, chỉ cần nhìn vào camera là vào ngay — không cần gõ mật khẩu. Khuôn mặt được nhận diện ngay trên thiết bị của anh/chị ạ.</p>
    <button class="btn btn-primary" id="gfOK">${ic('scan')} Kích hoạt ngay (3 giây)</button>
    <button class="btn btn-quiet mt" id="gfBo">Để sau</button>`);
  $('#gfOK', sh).onclick = async () => {
    closeSheet();
    await dangKyKhuonMat();
    onOK();
  };
  $('#gfBo', sh).onclick = () => { closeSheet(); onOK(); };
}
