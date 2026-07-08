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

  const now = box.querySelector('.hourline .now');
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

// ---------- Timeline theo giờ ----------
function veHourline(list, diChuyen, isToday) {
  const gioIso = (iso) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)));
  const gioStr = (s) => Number(String(s).split(':')[0]);
  const tatCa = [
    ...list.map((k) => gioIso(k.thoi_gian)),
    ...diChuyen.map((d) => gioStr(d.gio)),
  ];
  const min = Math.min(6, ...tatCa);
  const max = Math.max(21, ...tatCa) + 1;

  let nowTop = null;
  if (isToday) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour').value);
    const m = Number(parts.find((p) => p.type === 'minute').value);
    if (h >= min && h <= max) nowTop = (h - min + m / 60) * 46;
  }

  const HH = (n) => String(n).padStart(2, '0') + ':00';
  const gioBreakdown = (iso) =>
    new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

  let out = '<div class="hourline">';
  for (let h = min; h <= max; h++) {
    const slotKH = list.filter((k) => gioIso(k.thoi_gian) === h);
    const slotDC = diChuyen.filter((d) => gioStr(d.gio) === h);
    out += `<div class="h-lbl">${HH(h)}</div><div class="h-body">`;
    slotKH.forEach((k) => {
      const late = k.trang_thai === 'CHO' && new Date(k.thoi_gian) < new Date();
      const cls = k.trang_thai !== 'CHO' ? 'done' : (late ? 'late' : '');
      out += `<div class="plan-chip ${cls}" data-open="${k.id}">
        <span class="p-time">${gioBreakdown(k.thoi_gian)}</span>
        <span class="p-name">${esc(k.tieu_de)}</span>
      </div>`;
    });
    slotDC.forEach((d) => {
      out += `<div class="plan-chip move">
        ${ic('car')}<span class="p-time">${esc(d.gio)}</span>
        <span class="p-name">${esc(d.dia_diem)}</span>
      </div>`;
    });
    out += '</div>';
  }
  if (nowTop !== null) {
    const nowGio = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    out += `<div class="now" style="top: ${nowTop}px"><span class="now-lbl">${nowGio}</span></div>`;
  }
  out += '</div>';
  return out;
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
