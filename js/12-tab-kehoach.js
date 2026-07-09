// ============================================================
// CÔNG VIỆC — 12-tab-kehoach.js  (v2)
// · Segment: Hôm nay · Ngày mai · Tuần này · 30 ngày
// · Timeline theo giờ trong ngày (Hôm nay / Ngày mai)
// · Bấm chip → sửa / hủy / đánh dấu xong
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy,
         fmtNgay, fmtGio, homNayVN } from './03-ui.js';
import { MC } from './00-config.js';
import { moGhiAm } from './05-troly.js';

let seg = 'hom_nay';

export async function renderKeHoach(root) {
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Kế hoạch</h1>
        <p class="page-sub">Em nhắc đúng giờ, không để sót việc nào ạ.</p></div>
    </div>
    <div class="row" style="margin-bottom:14px">
      <button class="btn btn-primary" id="khMic">${ic('mic')} Nói kế hoạch</button>
      <button class="btn btn-quiet" id="khAdd">${ic('plus')} Tự nhập</button>
    </div>
    <div class="seg">
      <button data-s="hom_nay"  class="${seg === 'hom_nay'  ? 'on' : ''}">Hôm nay</button>
      <button data-s="ngay_mai" class="${seg === 'ngay_mai' ? 'on' : ''}">Ngày mai</button>
      <button data-s="tuan"     class="${seg === 'tuan'     ? 'on' : ''}">Tuần này</button>
      <button data-s="tat_ca"   class="${seg === 'tat_ca'   ? 'on' : ''}">30 ngày</button>
    </div>
    <div id="khBody"><div class="skeleton" style="height:140px"></div></div>`;

  const reload = () => renderKeHoach(root);
  $('#khMic', root).onclick = () => moGhiAm('troly', { onSaved: reload });
  $('#khAdd', root).onclick = () => formThem(reload);
  $$('.seg button', root).forEach((b) => b.onclick = () => { seg = b.dataset.s; renderKeHoach(root); });

  let sDen = 0, sTu = 0;
  if      (seg === 'hom_nay')  { sTu = 0; sDen = 0; }
  else if (seg === 'ngay_mai') { sTu = 1; sDen = 1; }
  else if (seg === 'tuan')     { sTu = 0; sDen = 6; }
  else                         { sTu = 0; sDen = 29; }
  const tu  = new Date(Date.now() + sTu  * 864e5).toISOString().slice(0, 10);
  const den = new Date(Date.now() + sDen * 864e5).toISOString().slice(0, 10);

  let ds = [], di = [];
  try {
    ds = await rpc('fn_ds_ke_hoach', { p_tu: tu, p_den: den });
    const hn = await rpc('fn_lay_hom_nay');
    di = hn.di_chuyen || [];
  } catch (e) {
    $('#khBody', root).innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`;
    return;
  }

  const ngayHN = homNayVN();
  const nhom = {};
  ds.forEach((k) => {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(k.thoi_gian));
    (nhom[d] ||= []).push(k);
  });

  const box = $('#khBody', root);
  if (seg === 'hom_nay' || seg === 'ngay_mai') {
    const ngay = seg === 'hom_nay' ? ngayHN
                : new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const list = nhom[ngay] || [];
    const listHT = list.filter((k) => k.trang_thai === 'CHO');
    const diNgay = seg === 'hom_nay' ? di : [];

    box.innerHTML = `
      <div class="card">
        <h2 class="card-title">${ic('calendar')} ${fmtNgay(ngay)}${seg === 'hom_nay' ? ' — Hôm nay' : ' — Ngày mai'}</h2>
        ${listHT.length === 0 && diNgay.length === 0
          ? `<p class="muted mb0">${seg === 'hom_nay' ? MC.chuaCoKeHoach : 'Ngày mai còn trống. Anh/chị lên kế hoạch trước để em nhắc ạ.'}</p>`
          : listHT.map((k) => veItem(k)).join('')}
      </div>
      ${(listHT.length + diNgay.length) > 0 ? `
        <div class="card mb0">
          <h2 class="card-title">${ic('clock')} Lịch trong ngày</h2>
          <p class="muted" style="font-size:13px;margin:-6px 0 4px">Trục thời gian giúp nhìn ra khoảng trống & lịch chồng lấn.</p>
          ${veHourline(listHT, diNgay, seg === 'hom_nay')}
        </div>` : ''}`;
  } else {
    if (!Object.keys(nhom).length) {
      box.innerHTML = `<div class="card mb0"><p class="muted mb0">${MC.chuaCoKeHoach}</p></div>`;
    } else {
      box.innerHTML = Object.entries(nhom).map(([d, arr]) => `
        <div class="card">
          <h2 class="card-title">${ic('calendar')} ${fmtNgay(d)}${d === ngayHN ? ' <span class="badge badge-acc">Hôm nay</span>' : ''}</h2>
          ${arr.map((k) => veItem(k)).join('')}
        </div>`).join('');
      box.lastElementChild?.classList.add('mb0');
    }
  }

  $$('button[data-act]', box).forEach((b) => b.onclick = (e) => { e.stopPropagation(); hanhDong(b, reload); });
  $$('[data-open]', box).forEach((el) => el.onclick = () => {
    const k = ds.find((x) => String(x.id) === el.dataset.open);
    if (k) moChiTiet(k, reload);
  });

  const now = box.querySelector('.timeplan .tp-now');
  if (now) setTimeout(() => now.scrollIntoView({ behavior: 'smooth', block: 'center' }), 260);
}

// ---------- Item trong list ----------
function veItem(k) {
  const badge = {
    CHO: '', DA_THUC_HIEN: `<span class="badge badge-acc">${ic('check')} Đã xong</span>`,
    DA_HUY: `<span class="badge badge-warn">Đã hủy</span>`,
  }[k.trang_thai] || '';
  const qua = k.trang_thai === 'CHO' && new Date(k.thoi_gian) < new Date();
  return `
    <div class="list-item" data-open="${k.id}" style="cursor:pointer">
      <span class="badge ${qua ? 'badge-danger' : 'badge-gold'} mono">${fmtGio(k.thoi_gian)}</span>
      <div class="list-main">
        <div class="list-title" ${k.trang_thai !== 'CHO' ? 'style="opacity:.55;text-decoration:line-through"' : ''}>
          ${esc(k.tieu_de)}</div>
        <div class="list-sub">${k.dia_diem ? esc(k.dia_diem) + ' · ' : ''}nhắc trước ${k.nhac_truoc_phut}′ ${badge}</div>
      </div>
      ${k.trang_thai === 'CHO' ? `
        <button class="btn btn-sm btn-quiet" data-act="xong" data-id="${k.id}" aria-label="Đánh dấu hoàn thành">${ic('check')}</button>` : ''}
    </div>`;
}

// ---------- Timeline thông minh: chỉ hiện MỐC THỰC TẾ ----------
// Không liệt kê mọi giờ. Gom kế hoạch + di chuyển thành các mốc
// theo thời gian, nối bằng một trục dọc. Chèn "Bây giờ" đúng vị trí.
function veHourline(list, diChuyen, isToday) {
  const phut = (iso) => {
    const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).formatToParts(new Date(iso));
    return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
  };
  const phutStr = (s) => { const [h, m] = String(s).split(':'); return Number(h) * 60 + Number(m || 0); };
  const hhmm = (iso) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

  // Gộp thành 1 danh sách mốc
  const moc = [
    ...list.map((k) => {
      const late = k.trang_thai === 'CHO' && new Date(k.thoi_gian) < new Date();
      return { p: phut(k.thoi_gian), gio: hhmm(k.thoi_gian),
        loai: k.trang_thai !== 'CHO' ? 'done' : (late ? 'late' : 'plan'),
        ten: k.tieu_de, dia: k.dia_diem, id: k.id, icon: 'calendar' };
    }),
    ...diChuyen.map((d) => ({ p: phutStr(d.gio), gio: d.gio, loai: 'move',
      ten: d.dia_diem, dia: d.ly_do, id: null, icon: 'car' })),
  ].sort((a, b) => a.p - b.p);

  if (!moc.length) return '';

  // Chèn mốc "Bây giờ" đúng vị trí trong dòng chảy
  let nowP = null;
  if (isToday) {
    const now = new Date();
    const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).formatToParts(now);
    nowP = Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
  }

  const rows = [];
  let daChen = false;
  const chenNow = () => {
    if (nowP === null || daChen) return;
    const g = String(Math.floor(nowP / 60)).padStart(2, '0') + ':' + String(nowP % 60).padStart(2, '0');
    rows.push(`<div class="tp-row tp-now"><div class="tp-time">${g}</div>
      <div class="tp-line"></div>
      <div class="tp-body"><span class="tp-now-lbl">Bây giờ</span></div></div>`);
    daChen = true;
  };

  moc.forEach((m) => {
    if (nowP !== null && m.p > nowP) chenNow();
    const openAttr = m.id ? `data-open="${m.id}"` : '';
    rows.push(`<div class="tp-row" ${openAttr} ${m.id ? 'style="cursor:pointer"' : ''}>
      <div class="tp-time">${esc(m.gio)}</div>
      <div class="tp-line"><span class="tp-dot ${m.loai}"></span></div>
      <div class="tp-body">
        <div class="tp-card ${m.loai}">
          ${ic(m.icon)}
          <div class="tp-main">
            <div class="tp-name">${esc(m.ten)}</div>
            ${m.dia ? `<div class="tp-sub">${esc(m.dia)}</div>` : ''}
          </div>
          ${m.loai === 'done' ? `<span class="tp-flag">${ic('check')}</span>`
            : m.loai === 'late' ? `<span class="tp-flag late">Trễ</span>` : ''}
        </div>
      </div>
    </div>`);
  });
  chenNow(); // nếu giờ hiện tại muộn hơn mọi mốc

  return `<div class="timeplan">${rows.join('')}</div>`;
}

// ---------- Sheet chi tiết ----------
function moChiTiet(k, reload) {
  const p = (n) => String(n).padStart(2, '0');
  const local = () => {
    const d = new Date(k.thoi_gian);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const sh = openSheet(`
    <h3>${ic('calendar')} Chi tiết kế hoạch</h3>
    <div class="field"><label>Việc gì</label>
      <input class="input" id="ktTd" value="${esc(k.tieu_de)}"></div>
    <div class="row">
      <div class="field" style="flex:1.3"><label>Thời gian</label>
        <input class="input" type="datetime-local" id="ktTg" value="${local()}"></div>
      <div class="field" style="flex:1"><label>Nhắc trước</label>
        <select class="input" id="ktNh">
          ${[0, 15, 30, 60, 120].map((m) => `<option value="${m}" ${m === k.nhac_truoc_phut ? 'selected' : ''}>${m === 0 ? 'Đúng giờ' : m + ' phút'}</option>`).join('')}
        </select></div>
    </div>
    <div class="field"><label>Địa điểm</label>
      <input class="input" id="ktDd" value="${esc(k.dia_diem || '')}"></div>
    <div class="row">
      ${k.trang_thai === 'CHO'
        ? `<button class="btn btn-primary" id="ktXong">${ic('check')} Đã xong</button>
           <button class="btn btn-quiet" id="ktLuu">${ic('edit')} Lưu sửa đổi</button>`
        : `<button class="btn btn-primary" id="ktKhoi">${ic('undo')} Khôi phục</button>`}
    </div>
    ${k.trang_thai === 'CHO'
      ? `<button class="btn btn-danger mt" id="ktHuy">${ic('x')} Hủy kế hoạch</button>` : ''}`);

  const dong = () => { closeSheet(); reload(); };

  $('#ktLuu', sh) && ($('#ktLuu', sh).onclick = () => busy($('#ktLuu', sh), async () => {
    const td = $('#ktTd', sh).value.trim(), tg = $('#ktTg', sh).value;
    if (!td || !tg) { toast('Anh/chị cho em xin tên việc và thời gian ạ.', 'err'); return; }
    try {
      await rpc('fn_sua_ke_hoach', { p_id: k.id, p_thay_doi: {
        tieu_de: td, thoi_gian: new Date(tg).toISOString(),
        dia_diem: $('#ktDd', sh).value.trim() || null,
        nhac_truoc_phut: Number($('#ktNh', sh).value),
      }});
      toast('Em đã cập nhật kế hoạch ạ.'); dong();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
  $('#ktXong', sh) && ($('#ktXong', sh).onclick = () => busy($('#ktXong', sh), async () => {
    try {
      await rpc('fn_sua_ke_hoach', { p_id: k.id, p_thay_doi: { trang_thai: 'DA_THUC_HIEN' } });
      toast('Em đã đánh dấu hoàn thành ạ.'); dong();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
  $('#ktHuy', sh) && ($('#ktHuy', sh).onclick = () => {
    const sh2 = openSheet(`
      <h3>${ic('alert')} Hủy kế hoạch</h3>
      <p class="muted">${MC.xacNhanXoa}</p>
      <div class="row mt">
        <button class="btn btn-quiet" id="hkNo">Giữ lại</button>
        <button class="btn btn-danger" id="hkYes">${ic('x')} Hủy</button>
      </div>`);
    $('#hkNo', sh2).onclick = closeSheet;
    $('#hkYes', sh2).onclick = () => busy($('#hkYes', sh2), async () => {
      try { await rpc('fn_sua_ke_hoach', { p_id: k.id, p_thay_doi: { trang_thai: 'DA_HUY' } });
        closeSheet(); toast('Em đã hủy kế hoạch ạ.'); reload();
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  });
  $('#ktKhoi', sh) && ($('#ktKhoi', sh).onclick = () => busy($('#ktKhoi', sh), async () => {
    try { await rpc('fn_sua_ke_hoach', { p_id: k.id, p_thay_doi: { trang_thai: 'CHO' } });
      toast('Em đã khôi phục kế hoạch ạ.'); dong();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
}

function hanhDong(b, reload) {
  return busy(b, async () => {
    try {
      await rpc('fn_sua_ke_hoach', { p_id: Number(b.dataset.id), p_thay_doi: { trang_thai: 'DA_THUC_HIEN' } });
      toast('Em đã đánh dấu hoàn thành ạ.'); reload();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}

function formThem(reload) {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date(Date.now() + 3600e3);
  const mac = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
  const sh = openSheet(`
    <h3>${ic('calendar')} Thêm kế hoạch</h3>
    <div class="field"><label>Việc gì</label>
      <input class="input" id="fkTd" placeholder="Vd: Họp nhà cung cấp vải"></div>
    <div class="row">
      <div class="field" style="flex:1.3"><label>Thời gian</label>
        <input class="input" type="datetime-local" id="fkTg" value="${mac}"></div>
      <div class="field" style="flex:1"><label>Nhắc trước</label>
        <select class="input" id="fkNh">
          <option value="15">15 phút</option><option value="30" selected>30 phút</option>
          <option value="60">1 giờ</option><option value="120">2 giờ</option>
        </select></div>
    </div>
    <div class="field"><label>Địa điểm</label><input class="input" id="fkDd"></div>
    <button class="btn btn-primary" id="fkOK">${ic('check')} Lưu kế hoạch</button>`);
  $('#fkOK', sh).onclick = () => busy($('#fkOK', sh), async () => {
    const td = $('#fkTd', sh).value.trim(), tg = $('#fkTg', sh).value;
    if (!td || !tg) { toast('Anh/chị cho em xin tên việc và thời gian ạ.', 'err'); return; }
    try {
      await rpc('fn_tao_ke_hoach', {
        p_tieu_de: td, p_thoi_gian: new Date(tg).toISOString(),
        p_dia_diem: $('#fkDd', sh).value.trim() || null, p_mo_ta: null,
        p_nhac_truoc_phut: Number($('#fkNh', sh).value), p_nguon: 'TU_TAO',
      });
      closeSheet(); toast(MC.daLuuKeHoach); reload();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}
