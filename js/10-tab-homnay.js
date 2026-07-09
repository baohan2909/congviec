// ============================================================
// CÔNG VIỆC — 10-tab-homnay.js
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, nl2html, toast, openSheet, closeSheet, busy, fmtNgay, fmtGio, rung } from './03-ui.js';
import { MC } from './00-config.js';
import { moGhiAm } from './05-troly.js';

let D = null; // dữ liệu hôm nay

export async function renderHomNay(root) {
  const nd = phien.nd();
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Hôm nay</h1>
        <p class="page-sub">${esc(MC.chao(nd.ten_goi))}</p></div>
      <span class="date-chip" id="hnDate"></span>
    </div>
    <div id="hnBody">
      <div class="skeleton" style="height:150px;margin-bottom:14px"></div>
      <div class="skeleton" style="height:180px"></div>
    </div>`;

  try { D = await rpc('fn_lay_hom_nay'); }
  catch (e) { $('#hnBody', root).innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }

  $('#hnDate', root).textContent = fmtNgay(D.ngay);
  document.querySelector('.tab[data-id="homnay"]')
    ?.classList.toggle('hasdot', (D.nhac_viec || []).length > 0);

  $('#hnBody', root).innerHTML = `
    <div id="hnNhac"></div>
    <div class="card assistant-card">
      <div class="assistant-name">${esc(MC.troLyCua(nd.ten_goi))}</div>
      <p class="assistant-hint">${MC.micGoiY}</p>
      <button class="mic-btn" id="hnMic" aria-label="Nói với trợ lý">${ic('mic')}</button>
    </div>
    <div class="card" id="hnCheckin"></div>
    <div class="card" id="hnBaoCao"></div>
    <div class="card mb0" id="hnKeHoach"></div>`;

  $('#hnMic', root).onclick = () => { rung(); moGhiAm('troly', { onSaved: () => renderHomNay(root) }); };

  veNhac(root); veCheckin(root); veBaoCao(root); veKeHoach(root);
}

// ---------- Nhắc việc ----------
function veNhac(root) {
  const box = $('#hnNhac', root);
  box.innerHTML = (D.nhac_viec || []).map((n) => `
    <div class="remind" data-id="${n.id}">
      ${ic('bell')}<p>${esc(n.noi_dung)}</p>
      <button aria-label="Đã xem">${ic('x')}</button>
    </div>`).join('');
  $$('.remind button', box).forEach((b) => b.onclick = async () => {
    const el = b.closest('.remind');
    el.remove();
    try { await rpc('fn_da_xem_nhac', { p_id: Number(el.dataset.id) }); } catch {}
    if (!$('.remind', box)) document.querySelector('.tab[data-id="homnay"]')?.classList.remove('hasdot');
  });
}

// ---------- Check-in ----------
function veCheckin(root) {
  const box = $('#hnCheckin', root);
  const c = D.checkin;

  if (!c) {
    box.innerHTML = `
      <h2 class="card-title">${ic('pin')} ${MC.chuaCheckin}</h2>
      <div class="status-grid">
        ${(D.trang_thai_ds || []).map((t) => `
          <button class="btn status-btn" data-loai="${t.ma}" data-can="${t.can_dia_diem}">
            ${ic(t.icon)} ${esc(t.ten)}
          </button>`).join('')}
      </div>`;
    $$('.status-btn', box).forEach((b) => b.onclick = () => {
      rung();
      if (b.dataset.can === 'true') hoiDiaDiem(b.dataset.loai, root);
      else luuCheckin(b.dataset.loai, null, null, root);
    });
    return;
  }

  const ten = (D.trang_thai_ds || []).find((t) => t.ma === c.loai)?.ten || c.loai;
  const gioBayGio = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  // Timeline nơi làm việc: MỐC ĐẦU = check-in gốc + các mục KẾ HOẠCH hôm nay CÓ ĐỊA ĐIỂM
  const moc = [];
  // mốc check-in (điểm bắt đầu ngày) — read-only
  const gioCheckin = c.tao_luc
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(c.tao_luc))
    : '';
  moc.push({ id: null, goc: true, gio: gioCheckin, iso: c.tao_luc || new Date().toISOString(),
    noi: c.dia_diem || ten });
  (D.ke_hoach || []).filter((k) => k.dia_diem).forEach((k) => moc.push({
    id: k.id, goc: false, gio: fmtGio(k.thoi_gian), iso: k.thoi_gian, noi: k.dia_diem, tieu_de: k.tieu_de,
  }));
  moc.sort((a, b) => new Date(a.iso) - new Date(b.iso));
  const nowISO = new Date().toISOString();
  const mocHienTai = moc.filter((m) => m.iso <= nowISO).pop() || moc[0];
  const noiHienTai = mocHienTai ? mocHienTai.noi : (c.dia_diem || ten);

  box.innerHTML = `
    <div class="hd-ngay"><h2 class="card-title mb0">${ic('pin')} Nơi làm việc hiện tại</h2>
      <span class="wn-clock mono" id="hnClock">${gioBayGio}</span></div>
    <div class="worknow">
      <button class="badge badge-acc wn-loai" id="wnLoai" style="border:none;cursor:pointer">${ic('check')} ${esc(ten)} ${ic('edit', 'ic-xs')}</button>
      ${noiHienTai && noiHienTai !== ten ? `<span class="wn-place">${ic('pin')} ${esc(noiHienTai)}</span>` : ''}
      ${c.ghi_chu ? `<div class="muted" style="font-size:14px;width:100%">${esc(c.ghi_chu)}</div>` : ''}
    </div>
    <hr class="hr">
    <div class="timeplan wl-plan">
      ${moc.map((m, i) => `
        <div class="tp-row ${m === mocHienTai ? 'tp-now' : ''}">
          <div class="tp-time">${esc(m.gio || '—')}</div>
          <div class="tp-line"><span class="tp-dot ${m === mocHienTai ? 'now' : (m.goc ? 'done' : '')}"></span></div>
          <div class="tp-body">
            <div class="tp-card">
              <div class="tp-place">${esc(m.noi)}</div>
              <div class="tp-tags">
                ${m.goc ? '<span class="badge badge-gold" style="font-size:10px">bắt đầu</span>' : ''}
                ${m === mocHienTai ? '<span class="badge badge-acc" style="font-size:10px">hiện tại</span>' : ''}
              </div>
            </div>
            ${m.goc ? '' : `<button class="wl-edit" data-edit="${m.id}" aria-label="Sửa">${ic('edit', 'ic')}</button>`}
          </div>
        </div>`).join('')}
    </div>
    <button class="btn btn-quiet btn-sm mt" id="ciThem" style="width:100%">${ic('plus')} Thêm nơi làm việc</button>`;

  // Đồng hồ giờ chạy (cập nhật mỗi 30s)
  clearInterval(window._hnClock);
  window._hnClock = setInterval(() => {
    const el = document.getElementById('hnClock');
    if (!el) { clearInterval(window._hnClock); return; }
    el.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }, 30000);

  $('#ciThem', box).onclick = () => formDiChuyen(root);
  $('#wnLoai', box) && ($('#wnLoai', box).onclick = () => formChonNoi(root));
  $$('.wl-edit', box).forEach((b) => b.onclick = () => {
    const m = moc.find((x) => String(x.id) === b.dataset.edit);
    if (m) formSuaNoi(m, root);
  });
}

// Sửa 1 mốc nơi làm việc (giờ + địa điểm) — cập nhật thẳng vào kế hoạch
function formSuaNoi(m, root) {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date(m.iso);
  const tg = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  const sh = openSheet(`
    <h3>${ic('edit')} Sửa nơi làm việc</h3>
    <div class="row" style="align-items:flex-end">
      <div class="field" style="flex:0 0 148px;min-width:0"><label>Thời gian</label>
        <input class="input" type="datetime-local" id="snTg" value="${tg}"></div>
      <div class="field" style="flex:1;min-width:0"><label>Địa điểm</label>
        <input class="input" id="snNoi" value="${esc(m.noi)}"></div>
    </div>
    <button class="btn btn-primary mt" id="snOK">${ic('check')} Lưu</button>
    <button class="btn btn-quiet danger mt" id="snXoa">${ic('x')} Xóa mốc này</button>`);
  $('#snOK', sh).onclick = () => busy($('#snOK', sh), async () => {
    const noi = $('#snNoi', sh).value.trim(), tgv = $('#snTg', sh).value;
    if (!noi || !tgv) { toast('Cho em xin giờ và địa điểm ạ.', 'err'); return; }
    try {
      await rpc('fn_sua_ke_hoach', { p_id: m.id, p_thay_doi: {
        dia_diem: noi, thoi_gian: new Date(tgv).toISOString(),
      }});
      closeSheet(); toast('Em đã cập nhật ạ.'); renderHomNay(root);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
  $('#snXoa', sh).onclick = () => busy($('#snXoa', sh), async () => {
    try {
      await rpc('fn_cap_nhat_ke_hoach', { p_id: m.id, p_trang_thai: 'DA_HUY' });
      closeSheet(); toast('Em đã xóa mốc này ạ.'); renderHomNay(root);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}

// Đổi nơi làm việc chính: hiện lại lưới chọn trong sheet, không xóa dữ liệu cũ tới khi chọn
function formChonNoi(root) {
  const sh = openSheet(`
    <h3>${ic('pin')} Nơi làm việc hiện tại</h3>
    <div class="status-grid">
      ${(D.trang_thai_ds || []).map((t) => `
        <button class="btn status-btn" data-loai="${t.ma}" data-can="${t.can_dia_diem}">
          ${ic(t.icon)} ${esc(t.ten)}
        </button>`).join('')}
    </div>`);
  $$('.status-btn', sh).forEach((b) => b.onclick = () => {
    rung();
    if (b.dataset.can === 'true') { closeSheet(); hoiDiaDiem(b.dataset.loai, root); }
    else { closeSheet(); luuCheckin(b.dataset.loai, null, null, root); }
  });
}

function hoiDiaDiem(loai, root) {
  const sh = openSheet(`
    <h3>${ic('car')} Công tác ở đâu ạ?</h3>
    <div class="field"><label>Nơi công tác (bắt buộc)</label>
      <input class="input" id="ctNoi" placeholder="Vd: Kho Bình Tân, chi nhánh Cần Thơ…"></div>
    <div class="field"><label>Nội dung / ghi chú</label>
      <input class="input" id="ctGc"></div>
    <button class="btn btn-primary" id="ctOK">${ic('check')} Ghi nhận</button>`);
  $('#ctOK', sh).onclick = () => busy($('#ctOK', sh), async () => {
    const noi = $('#ctNoi', sh).value.trim();
    if (!noi) { toast(MC.thieuDiaDiem, 'err'); return; }
    closeSheet();
    await luuCheckin(loai, noi, $('#ctGc', sh).value.trim() || null, root);
  });
}

async function luuCheckin(loai, diaDiem, ghiChu, root) {
  try {
    await rpc('fn_checkin', { p_loai: loai, p_dia_diem: diaDiem, p_ghi_chu: ghiChu });
    toast(MC.daCheckin); rung(18);
    renderHomNay(root);
  } catch (e) { toast(loiNguoi(e), 'err'); }
}

function formDiChuyen(root) {
  const now = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const sh = openSheet(`
    <h3>${ic('pin')} Thêm nơi làm việc</h3>
    <p class="muted mb0" style="font-size:14px">Nhập giờ và nơi làm việc, hoặc bấm mic để trợ lý ghi giúp ạ.</p>
    <div class="row mt" style="align-items:flex-end">
      <div class="field" style="flex:0 0 104px;min-width:0;margin-bottom:12px"><label>Giờ</label>
        <input class="input" type="time" id="dcGio" value="${now}"></div>
      <div class="field" style="flex:1;min-width:0;margin-bottom:12px"><label>Nơi làm việc</label>
        <input class="input" id="dcNoi" placeholder="Vd: Xưởng bảo hiểm…"></div>
    </div>
    <div class="field"><label>Ghi chú (không bắt buộc)</label><input class="input" id="dcLd"></div>
    <div class="row">
      <button class="btn btn-quiet" id="dcMic">${ic('mic')} Nhờ trợ lý</button>
      <button class="btn btn-primary" id="dcOK">${ic('check')} Ghi nhận</button>
    </div>`);
  $('#dcMic', sh).onclick = () => { closeSheet(); moGhiAm('checkin', { onSaved: () => renderHomNay(root) }); };
  $('#dcOK', sh).onclick = () => busy($('#dcOK', sh), async () => {
    const gio = $('#dcGio', sh).value, noi = $('#dcNoi', sh).value.trim();
    if (!noi) { toast('Anh/chị cho em xin nơi làm việc ạ.', 'err'); return; }
    try {
      // Tạo mốc nơi làm việc = một mục kế hoạch (timeline lấy từ kế hoạch)
      const hom = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      await rpc('fn_tao_ke_hoach', {
        p_tieu_de: `Có mặt tại ${noi}`, p_thoi_gian: `${hom}T${gio}:00+07:00`,
        p_dia_diem: noi, p_mo_ta: $('#dcLd', sh).value.trim() || null,
        p_nhac_truoc_phut: 0, p_nguon: 'HE_THONG',
      });
      closeSheet(); toast(MC.daLuuChung); renderHomNay(root);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}

// ---------- Báo cáo hôm nay ----------
function veBaoCao(root) {
  const box = $('#hnBaoCao', root);
  if (D.bao_cao) {
    box.innerHTML = `
      <h2 class="card-title">${ic('file')} Báo cáo hôm nay</h2>
      <span class="badge badge-acc">${ic('check')} Đã gửi lúc ${fmtGio(D.bao_cao.gui_luc)}</span>
      ${D.bao_cao.co_van_de ? `<span class="badge badge-danger" style="margin-left:8px">${ic('alert')} Có vấn đề</span>` : ''}
      <div class="mt muted" style="font-size:15px;max-height:110px;overflow:hidden">${nl2html(D.bao_cao.noi_dung)}</div>`;
  } else {
    box.innerHTML = `
      <h2 class="card-title">${ic('file')} Báo cáo hôm nay</h2>
      <p class="muted mb0">${MC.chuaCoBaoCao}</p>
      <button class="btn btn-primary mt" id="hnBcBtn">${ic('mic')} Báo cáo ngay</button>`;
    $('#hnBcBtn', box).onclick = () => window.cvGoTab?.('baocao');
  }
}

// ---------- Kế hoạch hôm nay ----------
function veKeHoach(root) {
  const box = $('#hnKeHoach', root);
  const ds = D.ke_hoach || [];
  box.innerHTML = `
    <h2 class="card-title">${ic('calendar')} Kế hoạch hôm nay</h2>
    ${ds.length ? ds.map((k) => `
      <div class="list-item">
        <span class="badge badge-gold mono">${fmtGio(k.thoi_gian)}</span>
        <div class="list-main">
          <div class="list-title">${esc(k.tieu_de)}</div>
          ${k.dia_diem ? `<div class="list-sub">${esc(k.dia_diem)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-quiet" data-id="${k.id}">${ic('check')} Xong</button>
      </div>`).join('') + `
      <button class="btn btn-quiet mt" id="hnKhBtn">${ic('mic')} Lập thêm kế hoạch</button>`
    : `<p class="muted">${MC.chuaCoKeHoach}</p>
       <button class="btn btn-primary mt" id="hnKhBtn">${ic('mic')} Kế hoạch ngay</button>`}`;
  $('#hnKhBtn', box) && ($('#hnKhBtn', box).onclick = () => moGhiAm('troly', { onSaved: () => renderHomNay(root) }));
  $$('button[data-id]', box).forEach((b) => b.onclick = () => busy(b, async () => {
    try {
      await rpc('fn_cap_nhat_ke_hoach', { p_id: Number(b.dataset.id), p_trang_thai: 'DA_THUC_HIEN' });
      toast('Em đã đánh dấu hoàn thành ạ.'); renderHomNay(root);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
}
