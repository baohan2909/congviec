// ============================================================
// CÔNG VIỆC — 14-tab-quantri.js  (chỉ ADMIN)
// ============================================================
import { rpc, anhURL, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, nl2html, toast, openSheet, closeSheet, busy, fmtGio, fmtNgay, fmtNgayGio, homNayVN } from './03-ui.js';
import { MC } from './00-config.js';

let seg = 'tongquan';

export function renderQuanTri(root) {
  root.innerHTML = `
    <div class="page-head"><div>
      <h1 class="page-title">Quản trị</h1>
      <p class="page-sub">Toàn cảnh vận hành trong một màn hình</p></div>
    </div>
    <div class="seg">
      <button data-s="tongquan" class="${seg === 'tongquan' ? 'on' : ''}">Tổng quan</button>
      <button data-s="nhansu" class="${seg === 'nhansu' ? 'on' : ''}">Nhân sự</button>
      <button data-s="baocao" class="${seg === 'baocao' ? 'on' : ''}">Báo cáo</button>
    </div>
    <div id="qtBody"><div class="skeleton" style="height:160px"></div></div>`;

  $$('.seg button', root).forEach((b) => b.onclick = () => { seg = b.dataset.s; renderQuanTri(root); });
  ({ tongquan: veTongQuan, nhansu: veNhanSu, baocao: veBaoCao })[seg]($('#qtBody', root));
}

// ============ TỔNG QUAN ============
async function veTongQuan(box) {
  let d;
  try { d = await rpc('fn_bqt_homnay'); }
  catch (e) { box.innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }

  const ns = d.nhan_su || [];
  const vanDe = (d.bao_cao_moi || []).filter((b) => b.co_van_de);
  const daBC = ns.filter((n) => n.da_bao_cao).length;

  // Nhóm theo địa điểm thực tế Nón Sơn
  const nhom = [
    { key: 'VAN_PHONG', ten: 'Văn phòng · Xưởng nón vải', icon: 'building' },
    { key: 'XUONG_BH',  ten: 'Xưởng bảo hiểm',            icon: 'factory' },
    { key: 'CONG_TAC',  ten: 'Công tác',                   icon: 'car' },
    { key: 'LAM_O_NHA', ten: 'Làm việc tại nhà',           icon: 'home' },
    { key: 'NGHI_PHEP', ten: 'Nghỉ phép',                  icon: 'leaf' },
  ].map((g) => ({ ...g, ds: ns.filter((n) => n.loai === g.key) }));
  const chua = ns.filter((n) => !n.loai);

  const veNguoi = (n, congTac = false) => `
    <div class="list-item" ${n.di_chuyen?.length ? `data-nv="${n.ma_nv}" style="cursor:pointer"` : ''}>
      <div class="avatar">${esc(n.ho_ten.trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase())}</div>
      <div class="list-main">
        <div class="list-title">${esc(n.ho_ten)}</div>
        <div class="list-sub">
          ${congTac && n.dia_diem
            ? `${ic('pin')} <b style="color:var(--acc-ink)">${esc(n.dia_diem)}</b>`
            : esc(n.ten_pb || '—')}
          ${n.di_chuyen?.length ? ` · ${n.di_chuyen.length} di chuyển` : ''}
        </div>
      </div>
      ${n.da_bao_cao ? `<span class="badge badge-acc">${ic('file')} Đã BC</span>`
                     : `<span class="badge badge-warn">Chưa BC</span>`}
    </div>`;

  box.innerHTML = `
    <div class="stat-row">
      <div class="stat"><b>${ns.length}</b><span>Thành viên</span></div>
      <div class="stat"><b style="color:${chua.length ? 'var(--danger)' : 'var(--acc-ink)'}">${chua.length}</b><span>Chưa cập nhật vị trí</span></div>
      <div class="stat"><b style="color:var(--acc-ink)">${daBC}</b><span>Đã gửi báo cáo</span></div>
      <div class="stat"><b style="color:${vanDe.length ? 'var(--danger)' : 'var(--ink)'}">${vanDe.length}</b><span>Vấn đề phát sinh</span></div>
    </div>

    <div class="card">
      <h2 class="card-title">${ic('users')} Hôm nay ai ở đâu</h2>
      ${chua.length ? `
        <div class="loc-group">
          <div class="loc-head miss">${ic('alert')} Chưa cập nhật vị trí <span class="cnt">${chua.length}</span></div>
          ${chua.map((n) => veNguoi(n)).join('')}
        </div>` : ''}
      ${nhom.filter((g) => g.ds.length).map((g) => `
        <div class="loc-group">
          <div class="loc-head">${ic(g.icon)} ${g.ten} <span class="cnt">${g.ds.length}</span></div>
          ${g.ds.map((n) => veNguoi(n, g.key === 'CONG_TAC')).join('')}
        </div>`).join('')}
    </div>

    <div class="card">
      <h2 class="card-title">${ic('file')} Báo cáo hôm nay (${(d.bao_cao_moi || []).length})</h2>
      ${(d.bao_cao_moi || []).length
        ? d.bao_cao_moi.map((b) => `
          <div class="list-item" data-bc="${b.id}" style="cursor:pointer">
            <div class="list-main">
              <div class="list-title">${esc(b.ho_ten)}
                ${b.co_van_de ? `<span class="badge badge-danger">${ic('alert')} Vấn đề</span>` : ''}</div>
              <div class="list-sub">${fmtGio(b.gui_luc)} · ${esc(b.noi_dung.replace(/\*\*/g, '').slice(0, 70))}…</div>
            </div>
            ${b.so_anh > 0 ? `<span class="badge badge-gold">${ic('camera')} ${b.so_anh}</span>` : ''}
          </div>`).join('')
        : '<p class="muted mb0">Chưa có báo cáo nào hôm nay ạ.</p>'}
    </div>

    <div class="card mb0">
      <h2 class="card-title">${ic('calendar')} Kế hoạch toàn công ty — 7 ngày tới (${(d.ke_hoach_toi || []).length})</h2>
      ${(d.ke_hoach_toi || []).length
        ? d.ke_hoach_toi.map((k) => `
          <div class="list-item">
            <span class="badge badge-gold mono">${fmtNgayGio(k.thoi_gian)}</span>
            <div class="list-main">
              <div class="list-title">${esc(k.tieu_de)}</div>
              <div class="list-sub">${esc(k.ho_ten)}${k.dia_diem ? ' · ' + esc(k.dia_diem) : ''}</div>
            </div>
          </div>`).join('')
        : '<p class="muted mb0">Chưa có kế hoạch nào được đăng ký ạ.</p>'}
    </div>`;

  // Timeline di chuyển
  $$('.list-item[data-nv]', box).forEach((el) => el.onclick = () => {
    const n = ns.find((x) => x.ma_nv === el.dataset.nv);
    openSheet(`
      <h3>${ic('car')} Di chuyển — ${esc(n.ho_ten)}</h3>
      <ul class="tl">${n.di_chuyen.map((dc) => `<li>
        <span class="tl-time">${esc(dc.gio)}</span>
        <div class="tl-place">${esc(dc.dia_diem)}</div>
        ${dc.ly_do ? `<div class="tl-note">${esc(dc.ly_do)}</div>` : ''}</li>`).join('')}
      </ul>`);
  });
  $$('.list-item[data-bc]', box).forEach((el) => el.onclick = () => moBaoCao(Number(el.dataset.bc)));
}

async function moBaoCao(id) {
  const den = homNayVN();
  const tu = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  try {
    const ds = await rpc('fn_ds_bao_cao', { p_tu: tu, p_den: den, p_ma_nv: null, p_chi_van_de: false });
    const b = ds.find((x) => x.id === id);
    if (!b) return;
    openSheet(`
      <h3>${ic('file')} ${esc(b.ho_ten)} · ${fmtNgay(b.ngay)}</h3>
      ${b.co_van_de ? `<span class="badge badge-danger">${ic('alert')} Có vấn đề phát sinh</span>` : ''}
      <div class="pv-block">${nl2html(b.noi_dung)}</div>
      ${b.anh?.length ? `<div class="photo-grid">${b.anh.map((a) =>
        `<div class="ph"><img src="${anhURL(a.storage_path)}" loading="lazy" alt=""></div>`).join('')}</div>` : ''}
      ${b.audio_path ? `<audio class="mt" controls style="width:100%" src="${anhURL(b.audio_path)}"></audio>` : ''}`);
  } catch (e) { toast(loiNguoi(e), 'err'); }
}

// ============ NHÂN SỰ ============
async function veNhanSu(box) {
  let ds, pb;
  try {
    [ds, pb] = await Promise.all([rpc('fn_admin_ds_nguoi_dung'), rpc('fn_admin_ds_phong_ban')]);
  } catch (e) { box.innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }

  box.innerHTML = `
    <button class="btn btn-primary" id="nsThem" style="margin-bottom:14px">${ic('plus')} Thêm thành viên</button>
    <div class="card mb0">
      ${ds.map((n) => `
        <div class="list-item" data-nv="${n.ma_nv}" style="cursor:pointer">
          <div class="avatar" ${n.trang_thai === 'TAM_KHOA' ? 'style="opacity:.4"' : ''}>
            ${esc(n.ho_ten.trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase())}</div>
          <div class="list-main">
            <div class="list-title">${esc(n.ho_ten)}
              ${n.vai_tro === 'ADMIN' ? `<span class="badge badge-gold">${ic('shield')} Admin</span>` : ''}
              ${n.trang_thai === 'TAM_KHOA' ? '<span class="badge badge-danger">Tạm khóa</span>' : ''}</div>
            <div class="list-sub mono">${esc(n.ma_nv)} · ${esc(n.ten_pb || '—')}</div>
          </div>
          ${ic('edit')}
        </div>`).join('')}
    </div>`;

  const pbOpts = (sel) => pb.map((p) =>
    `<option value="${p.ma_pb}" ${p.ma_pb === sel ? 'selected' : ''}>${esc(p.ten_pb)}</option>`).join('');
  const vtOpts = (sel) => ['NHAN_VIEN', 'TRUONG_BP', 'ADMIN'].map((v) =>
    `<option value="${v}" ${v === sel ? 'selected' : ''}>${{ NHAN_VIEN: 'Thành viên', TRUONG_BP: 'Trưởng bộ phận', ADMIN: 'Quản trị viên' }[v]}</option>`).join('');

  $('#nsThem', box).onclick = () => {
    const sh = openSheet(`
      <h3>${ic('plus')} Thêm thành viên</h3>
      <div class="row">
        <div class="field" style="flex:1"><label>Mã NV</label><input class="input mono" id="tMa" placeholder="NS00xxx"></div>
        <div class="field" style="flex:1.6"><label>Họ tên</label><input class="input" id="tTen"></div>
      </div>
      <div class="field"><label>Tên gọi (trợ lý sẽ xưng hô theo tên này)</label>
        <input class="input" id="tGoi" placeholder="Vd: anh Tuấn, chị Linh"></div>
      <div class="row">
        <div class="field" style="flex:1"><label>Phòng ban</label><select class="input" id="tPb">${pbOpts('')}</select></div>
        <div class="field" style="flex:1"><label>Vai trò</label><select class="input" id="tVt">${vtOpts('NHAN_VIEN')}</select></div>
      </div>
      <div class="field"><label>Mật khẩu ban đầu (≥ 6 ký tự, hệ thống sẽ bắt đổi khi đăng nhập)</label>
        <input class="input" id="tMk"></div>
      <button class="btn btn-primary" id="tOK">${ic('check')} Tạo tài khoản</button>`);
    $('#tOK', sh).onclick = () => busy($('#tOK', sh), async () => {
      try {
        await rpc('fn_admin_tao_nguoi_dung', {
          p_ma_nv: $('#tMa', sh).value, p_ho_ten: $('#tTen', sh).value,
          p_ten_goi: $('#tGoi', sh).value, p_ma_pb: $('#tPb', sh).value,
          p_vai_tro: $('#tVt', sh).value, p_mat_khau: $('#tMk', sh).value,
        });
        closeSheet(); toast('Em đã tạo tài khoản mới ạ.'); veNhanSu(box);
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  };

  $$('.list-item[data-nv]', box).forEach((el) => el.onclick = () => {
    const n = ds.find((x) => x.ma_nv === el.dataset.nv);
    const khoa = n.trang_thai === 'TAM_KHOA';
    const sh = openSheet(`
      <h3>${ic('edit')} ${esc(n.ho_ten)} <span class="mono muted" style="font-size:13px">${esc(n.ma_nv)}</span></h3>
      <div class="field"><label>Họ tên</label><input class="input" id="sTen" value="${esc(n.ho_ten)}"></div>
      <div class="field"><label>Tên gọi</label><input class="input" id="sGoi" value="${esc(n.ten_goi)}"></div>
      <div class="row">
        <div class="field" style="flex:1"><label>Phòng ban</label><select class="input" id="sPb">${pbOpts(n.ma_phong_ban)}</select></div>
        <div class="field" style="flex:1"><label>Vai trò</label><select class="input" id="sVt">${vtOpts(n.vai_tro)}</select></div>
      </div>
      <div class="field"><label>Đặt lại mật khẩu (bỏ trống nếu giữ nguyên)</label>
        <input class="input" id="sMk" placeholder="Mật khẩu mới…"></div>
      <button class="btn btn-primary" id="sOK">${ic('check')} Lưu thay đổi</button>
      <button class="btn ${khoa ? 'btn-quiet' : 'btn-danger'} mt" id="sKhoa">
        ${khoa ? ic('check') + ' Mở khóa tài khoản' : ic('x') + ' Tạm khóa tài khoản'}</button>`);

    $('#sOK', sh).onclick = () => busy($('#sOK', sh), async () => {
      try {
        await rpc('fn_admin_cap_nhat_nguoi_dung', {
          p_ma_nv: n.ma_nv,
          p_thay_doi: {
            ho_ten: $('#sTen', sh).value, ten_goi: $('#sGoi', sh).value,
            ma_phong_ban: $('#sPb', sh).value, vai_tro: $('#sVt', sh).value,
            mat_khau_moi: $('#sMk', sh).value || '',
          },
        });
        closeSheet(); toast('Em đã cập nhật xong ạ.'); veNhanSu(box);
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
    $('#sKhoa', sh).onclick = () => busy($('#sKhoa', sh), async () => {
      try {
        await rpc('fn_admin_cap_nhat_nguoi_dung', {
          p_ma_nv: n.ma_nv, p_thay_doi: { trang_thai: khoa ? 'HOAT_DONG' : 'TAM_KHOA' },
        });
        closeSheet(); toast(khoa ? 'Em đã mở khóa ạ.' : 'Em đã tạm khóa tài khoản ạ.'); veNhanSu(box);
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  });
}

// ============ BÁO CÁO TOÀN CÔNG TY ============
async function veBaoCao(box) {
  box.innerHTML = `
    <label class="pv-check" style="margin:0 0 12px 4px">
      <input type="checkbox" id="qbVd"> Chỉ hiện báo cáo có vấn đề</label>
    <div id="qbList"><div class="skeleton" style="height:110px"></div></div>`;
  const load = async () => {
    const den = homNayVN();
    const tu = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    let ds;
    try {
      ds = await rpc('fn_ds_bao_cao', {
        p_tu: tu, p_den: den, p_ma_nv: null, p_chi_van_de: $('#qbVd', box).checked,
      });
    } catch (e) { $('#qbList', box).innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }
    $('#qbList', box).innerHTML = ds?.length ? `<div class="card mb0">
      ${ds.map((b) => `
        <div class="list-item" data-bc="${b.id}" style="cursor:pointer">
          <div class="list-main">
            <div class="list-title">${esc(b.ho_ten)}
              ${b.co_van_de ? `<span class="badge badge-danger">${ic('alert')} Vấn đề</span>` : ''}</div>
            <div class="list-sub">${fmtNgay(b.ngay)} · ${esc(b.noi_dung.replace(/\*\*/g, '').slice(0, 66))}…</div>
          </div>
          ${b.anh?.length ? `<span class="badge badge-gold">${ic('camera')} ${b.anh.length}</span>` : ''}
        </div>`).join('')}</div>`
      : '<div class="card mb0"><p class="muted mb0">Không có báo cáo nào trong 7 ngày ạ.</p></div>';
    $$('.list-item[data-bc]', box).forEach((el) => el.onclick = () => moBaoCao(Number(el.dataset.bc)));
  };
  $('#qbVd', box).onchange = load;
  load();
}
