// ============================================================
// CÔNG VIỆC — 13-tab-taikhoan.js
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, fmtNgay } from './03-ui.js';
import { MC, SYS } from './00-config.js';
import { dangXuat } from './02-auth.js';
import { trangThaiPush, batPush, tatPush, pushHoTro } from './06-push.js';
import { faceLocal, dangKyKhuonMat, huyDangKyKhuonMat } from './07-face.js';

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
      <h2 class="card-title">${ic('bell')} Thông báo</h2>
      <button class="btn btn-quiet" id="tkPush"><span class="spinner"></span></button>
      <p class="muted mt mb0" style="font-size:13px">Nhắc kế hoạch, báo cáo, deadline kể cả khi không mở app. Trên iPhone cần cài app lên màn hình chính trước ạ.</p>
    </div>

    <div class="card">
      <h2 class="card-title">${ic('key')} Bảo mật</h2>
      <button class="btn btn-quiet" id="tkDoiMk">${ic('key')} Đổi mật khẩu</button>
      <button class="btn btn-quiet mt" id="tkFace">${ic('scan')} ${faceLocal() ? 'Tắt đăng nhập khuôn mặt' : 'Bật đăng nhập khuôn mặt'}</button>
    </div>

    ${nd.vai_tro === 'ADMIN' ? `
    <div class="card admin-zone">
      <h2 class="card-title">${ic('users')} Quản trị</h2>
      <div class="admin-grid">
        <button class="btn btn-quiet admin-btn" id="tkTaoTK">${ic('plus')} Tạo tài khoản</button>
        <button class="btn btn-quiet admin-btn" id="tkImport">${ic('factory')} Nhập từ Excel</button>
        <button class="btn btn-quiet admin-btn" id="tkNhanSu">${ic('users')} Danh sách thành viên</button>
        <button class="btn btn-quiet admin-btn danger" id="tkXoaDL">${ic('x')} Xóa dữ liệu theo ngày</button>
      </div>
    </div>` : ''}

    <button class="btn btn-danger" id="tkOut">${ic('out')} Đăng xuất</button>
    <p class="muted mono mt" style="text-align:center;font-size:12px">Công việc · v${SYS.version}</p>`;

  if (nd.vai_tro === 'ADMIN') {
    $('#tkTaoTK', root).onclick = () => formTaoTaiKhoan();
    $('#tkImport', root).onclick = () => formImportExcel();
    $('#tkNhanSu', root).onclick = () => { window.cvGoTab?.('quantri'); };
    $('#tkXoaDL', root).onclick = () => formXoaDuLieu();
  }

  root.querySelectorAll('[data-th]').forEach((b) => b.onclick = () => {
    const th = b.dataset.th;
    document.documentElement.dataset.theme = th;
    localStorage.setItem('cv_theme', th);
    document.querySelector('meta[name=theme-color]')
      ?.setAttribute('content', th === 'dark' ? '#050B1F' : '#EEF3FA');
    renderTaiKhoan(root);
  });

  // Push
  (async () => {
    const btn = $('#tkPush', root);
    const tt = await trangThaiPush();
    const veNut = (t) => {
      btn.innerHTML = t === 'DANG_BAT'
        ? `${ic('bell')} Tắt thông báo đẩy`
        : `${ic('bell')} Bật thông báo đẩy`;
      btn.disabled = (t === 'KHONG_HO_TRO');
      if (t === 'KHONG_HO_TRO') btn.innerHTML = `${ic('bell')} Thiết bị chưa hỗ trợ thông báo`;
      if (t === 'BI_CHAN') btn.innerHTML = `${ic('bell')} Thông báo đang bị chặn trong Cài đặt máy`;
    };
    veNut(tt);
    btn.onclick = async () => {
      const t = await trangThaiPush();
      if (t === 'DANG_BAT') { await tatPush(); veNut('CHUA_BAT'); }
      else { const ok = await batPush(); veNut(ok ? 'DANG_BAT' : await trangThaiPush()); }
    };
  })();

  // Face
  $('#tkFace', root).onclick = async () => {
    if (faceLocal()) { await huyDangKyKhuonMat(); }
    else { await dangKyKhuonMat(); }
    renderTaiKhoan(root);
  };

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
    $('#outYes', sh).onclick = () => busy($('#outYes', sh), dangXuat);
  };
}


// ============================================================
// QUẢN TRỊ — TẠO TÀI KHOẢN
// ============================================================
const TEN_VT_FORM = { NHAN_VIEN: 'Thành viên', TRUONG_BP: 'Trưởng bộ phận', ADMIN: 'Quản trị viên' };

async function _dsPhongBan() { try { return await rpc('fn_admin_ds_phong_ban'); } catch { return []; } }

async function formTaoTaiKhoan() {
  const pb = await _dsPhongBan();
  const sh = openSheet(`
    <h3>${ic('plus')} Tạo tài khoản</h3>
    <div class="field"><label>Họ và tên *</label>
      <input class="input" id="ttHoTen" placeholder="Nguyễn Văn A" autocomplete="off"></div>
    <div class="row">
      <div class="field" style="flex:1"><label>Ngày sinh</label>
        <input class="input" type="date" id="ttNgaySinh"></div>
      <div class="field" style="flex:1"><label>Số điện thoại</label>
        <input class="input" id="ttSdt" inputmode="tel" placeholder="09xx xxx xxx"></div>
    </div>
    <div class="field"><label>Chức vụ</label>
      <input class="input" id="ttChucVu" placeholder="Vd: Nhân viên kho"></div>
    <div class="row">
      <div class="field" style="flex:1"><label>Vai trò</label>
        <select class="input" id="ttVaiTro">
          <option value="NHAN_VIEN">Thành viên</option>
          <option value="TRUONG_BP">Trưởng bộ phận</option>
          <option value="ADMIN">Quản trị viên</option>
        </select></div>
      <div class="field" style="flex:1"><label>Phòng ban</label>
        <select class="input" id="ttPB"><option value="">— Không —</option>
          ${pb.map((p) => `<option value="${p.ma_pb}">${esc(p.ten_pb)}</option>`).join('')}
        </select></div>
    </div>
    <div class="pv-block" style="font-size:13px">
      ${ic('key')} Tên đăng nhập = họ tên viết liền không dấu · Mật khẩu mặc định <b>NS2396</b> (đổi khi đăng nhập lần đầu).
    </div>
    <button class="btn btn-primary mt" id="ttOK">${ic('check')} Tạo tài khoản</button>`);

  $('#ttOK', sh).onclick = () => busy($('#ttOK', sh), async () => {
    const ht = $('#ttHoTen', sh).value.trim();
    if (!ht) { toast('Anh/chị cho em xin họ tên ạ.', 'err'); return; }
    try {
      const r = await rpc('fn_admin_tao_tai_khoan', {
        p_ho_ten: ht,
        p_ngay_sinh: $('#ttNgaySinh', sh).value || null,
        p_chuc_vu: $('#ttChucVu', sh).value.trim() || null,
        p_sdt: $('#ttSdt', sh).value.trim() || null,
        p_vai_tro: $('#ttVaiTro', sh).value,
        p_ma_pb: $('#ttPB', sh).value || null,
        p_ten_goi: null,
      });
      closeSheet();
      openSheet(`
        <h3>${ic('check')} Đã tạo tài khoản</h3>
        <div class="pv-block">
          <div class="kv"><span>Họ tên</span><b>${esc(ht)}</b></div>
          <div class="kv"><span>Mã NV</span><b class="mono">${esc(r.ma_nv)}</b></div>
          <div class="kv"><span>Tên đăng nhập</span><b class="mono">${esc(r.username)}</b></div>
          <div class="kv"><span>Mật khẩu</span><b class="mono">${esc(r.mat_khau)}</b></div>
        </div>
        <p class="muted mb0" style="font-size:13px">Gửi thông tin này cho thành viên. Họ sẽ đổi mật khẩu khi đăng nhập lần đầu ạ.</p>
        <button class="btn btn-primary mt" id="ttXong">${ic('check')} Xong</button>
        <button class="btn btn-quiet mt" id="ttTiep">${ic('plus')} Tạo tiếp</button>`);
      $('#ttXong').onclick = closeSheet;
      $('#ttTiep').onclick = () => { closeSheet(); formTaoTaiKhoan(); };
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}

// ============================================================
// QUẢN TRỊ — NHẬP TỪ EXCEL
// ============================================================
async function formImportExcel() {
  const sh = openSheet(`
    <h3>${ic('factory')} Nhập tài khoản từ Excel</h3>
    <p class="muted mb0" style="font-size:14px">File Excel (.xlsx) cần các cột: <b>Họ tên</b> (bắt buộc), Ngày sinh, Chức vụ, SĐT, Vai trò, Mã phòng ban. Hàng đầu là tiêu đề.</p>
    <button class="btn btn-quiet mt" id="imTai">${ic('file')} Tải file mẫu</button>
    <div class="field mt"><label>Chọn file Excel</label>
      <input class="input" type="file" id="imFile" accept=".xlsx,.xls"></div>
    <div id="imKetQua"></div>`);

  $('#imTai', sh).onclick = () => taiFileMau();
  $('#imFile', sh).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const box = $('#imKetQua', sh);
    box.innerHTML = '<div class="skeleton mt" style="height:60px"></div>';
    try {
      const XLSX = await importXLSX();
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const ds = rows.map((r) => ({
        ho_ten: String(r['Họ tên'] || r['Ho ten'] || r['ho_ten'] || '').trim(),
        ngay_sinh: chuanNgay(r['Ngày sinh'] || r['ngay_sinh'] || ''),
        chuc_vu: String(r['Chức vụ'] || r['chuc_vu'] || '').trim(),
        sdt: String(r['SĐT'] || r['SDT'] || r['sdt'] || '').trim(),
        vai_tro: mapVaiTro(r['Vai trò'] || r['vai_tro'] || ''),
        ma_pb: String(r['Mã phòng ban'] || r['ma_pb'] || '').trim() || null,
      })).filter((x) => x.ho_ten);
      if (!ds.length) { box.innerHTML = '<p class="muted mt">Không đọc được dòng nào có họ tên ạ.</p>'; return; }
      box.innerHTML = `
        <div class="pv-block mt">Đọc được <b>${ds.length}</b> dòng. Xác nhận nhập?</div>
        <button class="btn btn-primary mt" id="imOK">${ic('check')} Nhập ${ds.length} tài khoản</button>`;
      $('#imOK', box).onclick = () => busy($('#imOK', box), async () => {
        try {
          const kq = await rpc('fn_admin_tao_tai_khoan_loat', { p_ds: ds });
          const ok = kq.filter((x) => x.ok), loi = kq.filter((x) => !x.ok);
          box.innerHTML = `
            <div class="pv-block mt">
              <div class="kv"><span>Thành công</span><b style="color:var(--acc-ink)">${ok.length}</b></div>
              <div class="kv"><span>Lỗi</span><b style="color:${loi.length ? 'var(--danger)' : 'var(--ink)'}">${loi.length}</b></div>
            </div>
            ${ok.length ? `
              <div class="pv-block">
                <b>${ic('key')} Tài khoản đã tạo — phát cho nhân viên:</b>
                <p class="muted" style="font-size:13px;margin:6px 0">Mật khẩu chung <b class="mono">NS2396</b>, đổi khi đăng nhập lần đầu.</p>
                <div class="acc-list">
                  ${ok.map((x) => `<div class="acc-row">
                    <div class="acc-name">${esc(x.ho_ten)}</div>
                    <div class="acc-user mono">${esc(x.username)}</div>
                  </div>`).join('')}
                </div>
                <button class="btn btn-quiet mt" id="imCopy">${ic('copy')} Sao chép danh sách</button>
              </div>` : ''}
            ${loi.length ? `<div class="pv-block"><b>Dòng lỗi:</b><br>${loi.map((x) => `${esc(x.ho_ten)}: ${esc(x.loi)}`).join('<br>')}</div>` : ''}
            <button class="btn btn-primary mt" id="imDong">${ic('check')} Xong</button>`;
          $('#imDong', box).onclick = closeSheet;
          $('#imCopy', box) && ($('#imCopy', box).onclick = async () => {
            const txt = ok.map((x) => `${x.ho_ten}\t${x.username}\tNS2396`).join('\n');
            try { await navigator.clipboard.writeText('Họ tên\tTên đăng nhập\tMật khẩu\n' + txt);
              toast('Đã sao chép danh sách tài khoản ạ.'); }
            catch { toast('Máy không cho sao chép tự động ạ.', 'err'); }
          });
        } catch (e) { toast(loiNguoi(e), 'err'); }
      });
    } catch (err) { box.innerHTML = `<p class="muted mt">Không đọc được file ạ: ${esc(String(err.message || err))}</p>`; }
  };
}

let _xlsx = null;
async function importXLSX() {
  if (_xlsx) return _xlsx;
  _xlsx = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
  return _xlsx;
}
async function taiFileMau() {
  try {
    const XLSX = await importXLSX();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Họ tên', 'Ngày sinh', 'Chức vụ', 'SĐT', 'Vai trò', 'Mã phòng ban'],
      ['Nguyễn Văn A', '1990-05-20', 'Nhân viên kho', '0901234567', 'Thành viên', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau');
    XLSX.writeFile(wb, 'mau_tai_khoan_NonSon.xlsx');
  } catch { toast('Chưa tạo được file mẫu ạ.', 'err'); }
}
function chuanNgay(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}
function mapVaiTro(v) {
  const s = String(v).toLowerCase();
  if (s.includes('quản trị') || s.includes('admin')) return 'ADMIN';
  if (s.includes('trưởng')) return 'TRUONG_BP';
  return 'NHAN_VIEN';
}

// ============================================================
// QUẢN TRỊ — XÓA DỮ LIỆU THEO NGÀY
// ============================================================
function formXoaDuLieu() {
  const homNay = new Date().toISOString().slice(0, 10);
  const sh = openSheet(`
    <h3>${ic('x')} Xóa dữ liệu theo ngày</h3>
    <p class="muted mb0" style="font-size:14px">Chọn loại dữ liệu và ngày cần xóa. Thao tác này không hoàn tác được ạ.</p>
    <div class="field mt"><label>Loại dữ liệu</label>
      <div class="row">
        <button class="btn btn-primary" id="xdBC" data-l="bao_cao" style="flex:1">${ic('file')} Báo cáo</button>
        <button class="btn btn-quiet" id="xdKH" data-l="ke_hoach" style="flex:1">${ic('calendar')} Kế hoạch</button>
      </div></div>
    <div class="field"><label>Ngày cần xóa</label>
      <input class="input" type="date" id="xdNgay" value="${homNay}" max="${homNay}"></div>
    <button class="btn btn-danger mt" id="xdOK">${ic('x')} Xóa dữ liệu ngày này</button>`);

  let loai = 'bao_cao';
  $('#xdBC', sh).onclick = () => { loai = 'bao_cao';
    $('#xdBC', sh).className = 'btn btn-primary'; $('#xdKH', sh).className = 'btn btn-quiet'; };
  $('#xdKH', sh).onclick = () => { loai = 'ke_hoach';
    $('#xdKH', sh).className = 'btn btn-primary'; $('#xdBC', sh).className = 'btn btn-quiet'; };

  $('#xdOK', sh).onclick = () => {
    const ngay = $('#xdNgay', sh).value;
    if (!ngay) { toast('Anh/chị chọn ngày ạ.', 'err'); return; }
    const ten = loai === 'bao_cao' ? 'báo cáo' : 'kế hoạch';
    const sh2 = openSheet(`
      <h3>${ic('alert')} Xác nhận xóa</h3>
      <p class="muted">Sắp xóa toàn bộ <b>${ten}</b> của ngày <b>${esc(ngay)}</b>. Không hoàn tác được. Anh/chị chắc chắn?</p>
      <div class="row mt">
        <button class="btn btn-quiet" id="xd2No">Giữ lại</button>
        <button class="btn btn-danger" id="xd2Yes">${ic('x')} Xóa</button>
      </div>`);
    $('#xd2No', sh2).onclick = closeSheet;
    $('#xd2Yes', sh2).onclick = () => busy($('#xd2Yes', sh2), async () => {
      try {
        const r = await rpc('fn_admin_xoa_theo_ngay', { p_loai: loai, p_ngay: ngay });
        closeSheet(); toast(`Đã xóa ${r.da_xoa} ${ten} của ngày ${ngay} ạ.`);
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  };
}
