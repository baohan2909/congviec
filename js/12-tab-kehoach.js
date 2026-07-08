// ============================================================
// CÔNG VIỆC — 12-tab-kehoach.js
// ============================================================
import { rpc, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, fmtNgay, fmtGio, homNayVN } from './03-ui.js';
import { MC } from './00-config.js';
import { moGhiAm } from './05-troly.js';

export async function renderKeHoach(root) {
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Kế hoạch</h1>
        <p class="page-sub">Em sẽ nhắc đúng giờ, không để sót việc nào ạ.</p></div>
    </div>
    <div class="row" style="margin-bottom:14px">
      <button class="btn btn-primary" id="khMic">${ic('mic')} Nói kế hoạch</button>
      <button class="btn btn-quiet" id="khAdd">${ic('plus')} Tự nhập</button>
    </div>
    <div id="khList"><div class="skeleton" style="height:120px"></div></div>`;

  const reload = () => renderKeHoach(root);
  $('#khMic', root).onclick = () => moGhiAm('troly', { onSaved: reload });
  $('#khAdd', root).onclick = () => formThem(reload);

  let ds;
  const tu = homNayVN();
  const den = new Date(Date.now() + 13 * 864e5).toISOString().slice(0, 10);
  try { ds = await rpc('fn_ds_ke_hoach', { p_tu: tu, p_den: den }); }
  catch (e) { $('#khList', root).innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }

  const box = $('#khList', root);
  if (!ds?.length) {
    box.innerHTML = `<div class="card mb0"><p class="muted mb0">${MC.chuaCoKeHoach}</p></div>`;
    return;
  }

  // Nhóm theo ngày
  const nhom = {};
  ds.forEach((k) => {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(k.thoi_gian));
    (nhom[d] ||= []).push(k);
  });

  box.innerHTML = Object.entries(nhom).map(([d, arr]) => `
    <div class="card">
      <h2 class="card-title">${ic('calendar')} ${fmtNgay(d)}${d === tu ? ' <span class="badge badge-gold">Hôm nay</span>' : ''}</h2>
      ${arr.map((k) => veItem(k)).join('')}
    </div>`).join('');
  box.lastElementChild?.classList.add('mb0');

  $$('button[data-act]', box).forEach((b) => b.onclick = () => hanhDong(b, reload));
}

function veItem(k) {
  const badge = {
    CHO: '', DA_THUC_HIEN: `<span class="badge badge-acc">${ic('check')} Đã thực hiện</span>`,
    DA_HUY: `<span class="badge badge-warn">Đã hủy</span>`,
  }[k.trang_thai] || '';
  const qua = k.trang_thai === 'CHO' && new Date(k.thoi_gian) < new Date();
  return `
    <div class="list-item">
      <span class="badge ${qua ? 'badge-danger' : 'badge-gold'} mono">${fmtGio(k.thoi_gian)}</span>
      <div class="list-main">
        <div class="list-title" ${k.trang_thai !== 'CHO' ? 'style="opacity:.55;text-decoration:line-through"' : ''}>
          ${esc(k.tieu_de)}</div>
        <div class="list-sub">${k.dia_diem ? esc(k.dia_diem) + ' · ' : ''}nhắc trước ${k.nhac_truoc_phut}′ ${badge}</div>
      </div>
      ${k.trang_thai === 'CHO' ? `
        <button class="btn btn-sm btn-quiet" data-act="xong" data-id="${k.id}">${ic('check')}</button>
        <button class="btn btn-sm btn-quiet" data-act="huy" data-id="${k.id}" aria-label="Hủy">${ic('x')}</button>` : ''}
    </div>`;
}

function hanhDong(b, reload) {
  const id = Number(b.dataset.id);
  if (b.dataset.act === 'xong') {
    return busy(b, async () => {
      try { await rpc('fn_cap_nhat_ke_hoach', { p_id: id, p_trang_thai: 'DA_THUC_HIEN' });
        toast('Em đã đánh dấu hoàn thành ạ.'); reload();
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  }
  const sh = openSheet(`
    <h3>${ic('alert')} Hủy kế hoạch</h3>
    <p class="muted">${MC.xacNhanXoa}</p>
    <div class="row mt">
      <button class="btn btn-quiet" id="hkNo">Giữ lại</button>
      <button class="btn btn-danger" id="hkYes">${ic('x')} Hủy kế hoạch</button>
    </div>`);
  $('#hkNo', sh).onclick = closeSheet;
  $('#hkYes', sh).onclick = () => busy($('#hkYes', sh), async () => {
    try { await rpc('fn_cap_nhat_ke_hoach', { p_id: id, p_trang_thai: 'DA_HUY' });
      closeSheet(); toast('Em đã hủy kế hoạch ạ.'); reload();
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
