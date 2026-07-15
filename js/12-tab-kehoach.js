// ============================================================
// CÔNG VIỆC — 12-tab-kehoach.js  (v2)
// · Segment: Hôm nay · Ngày mai · Tuần này · 30 ngày
// · Timeline theo giờ trong ngày (Hôm nay / Ngày mai)
// · Bấm chip → sửa / hủy / đánh dấu xong
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy,
         fmtNgay, fmtGio, homNayVN, mdMini } from './03-ui.js';
import { MC } from './00-config.js';
import { moGhiAm } from './05-troly.js';

let seg = 'hom_nay';
let tcTu = null, tcDen = null;   // khoảng ngày tra cứu tùy chọn

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
      <button data-s="tuan"     class="${seg === 'tuan'     ? 'on' : ''}">Tuần</button>
      <button data-s="tra_cuu"  class="${seg === 'tra_cuu'  ? 'on' : ''}">Tra cứu</button>
    </div>
    ${seg === 'tra_cuu' ? `
    <div class="tc-row">
      <input class="input" type="date" id="tcTu" value="${tcTu || new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)}">
      <span class="tc-sep">→</span>
      <input class="input" type="date" id="tcDen" value="${tcDen || new Date().toISOString().slice(0, 10)}">
      <button class="btn btn-primary btn-sm" id="tcXem">${ic('search')} Xem</button>
    </div>` : ''}
    <div id="khBody"><div class="skeleton" style="height:140px"></div></div>`;

  const reload = () => renderKeHoach(root);
  $('#khMic', root).onclick = () => moGhiAm('troly', { onSaved: reload });
  $('#khAdd', root).onclick = () => formThem(reload);
  $$('.seg button', root).forEach((b) => b.onclick = () => { seg = b.dataset.s; renderKeHoach(root); });
  $('#tcXem', root) && ($('#tcXem', root).onclick = () => {
    tcTu = $('#tcTu', root).value; tcDen = $('#tcDen', root).value;
    if (!tcTu || !tcDen) { toast('Anh/chị chọn đủ 2 ngày ạ.', 'err'); return; }
    if (tcTu > tcDen) { const t = tcTu; tcTu = tcDen; tcDen = t; }
    renderKeHoach(root);
  });

  let sDen = 0, sTu = 0;
  if      (seg === 'hom_nay')  { sTu = 0; sDen = 0; }
  else if (seg === 'ngay_mai') { sTu = 1; sDen = 1; }
  else if (seg === 'tuan')     { sTu = 0; sDen = 6; }
  else                         { sTu = -29; sDen = 0; }   // tra cứu mặc định: 30 ngày QUA
  let tu  = new Date(Date.now() + sTu  * 864e5).toISOString().slice(0, 10);
  let den = new Date(Date.now() + sDen * 864e5).toISOString().slice(0, 10);
  if (seg === 'tra_cuu' && tcTu && tcDen) { tu = tcTu; den = tcDen; }
  else if (seg === 'tra_cuu') { tu = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10); }

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
    const listHT = list.filter((k) => k.trang_thai !== 'DA_HUY');
    const diNgay = seg === 'hom_nay' ? di : [];

    box.innerHTML = `
      ${(listHT.length + diNgay.length) === 0 ? `
      <div class="card">
        <h2 class="card-title">${ic('calendar')} ${fmtNgay(ngay)}${seg === 'hom_nay' ? ' — Hôm nay' : ' — Ngày mai'}</h2>
        <p class="muted mb0">${seg === 'hom_nay' ? MC.chuaCoKeHoach : 'Ngày mai còn trống. Anh/chị lên kế hoạch trước để em nhắc ạ.'}</p>
      </div>` : ''}
      ${(listHT.length + diNgay.length) > 0 ? `
        <div class="card mb0">
          <div class="hd-ngay"><h2 class="card-title mb0">${ic('clock')} ${fmtNgay(ngay)}${seg === 'hom_nay' ? ' · Hôm nay' : ' · Ngày mai'}</h2>
            <div class="seg-mini" id="khView">
              <button data-v="timeline" class="on">Timeline</button>
              <button data-v="vanban">Văn bản</button>
            </div>
          </div>
          <div id="khTimeline">
            <p class="muted" style="font-size:13px;margin:2px 0 4px">Trục thời gian giúp nhìn ra khoảng trống & lịch chồng lấn.</p>
            ${veHourline(listHT, diNgay, seg === 'hom_nay')}
          </div>
          <div id="khVanBan" style="display:none">
            <div class="md-doc" id="khVbDoc">${mdMini(keHoachSangVanBan(listHT, diNgay))}</div>
          </div>
          <div class="lich-row mt">
            <select class="input" id="khLichPhut">
              <option value="15">Trước 15′</option>
              <option value="30" selected>Trước 30′</option>
              <option value="60">Trước 1h</option>
              <option value="0">Đúng giờ</option>
            </select>
            <button class="btn btn-quiet btn-sm" id="khLichAll">${ic('bell')} Cài tất cả lịch vào iPhone</button>
          </div>
        </div>` : ''}`;
    // Cài TẤT CẢ kế hoạch của ngày vào Lịch iPhone (1 file .ics nhiều sự kiện)
    $('#khLichAll', box) && ($('#khLichAll', box).onclick = () => {
      if (!listHT.length) { toast('Chưa có kế hoạch nào ạ.', 'err'); return; }
      taoICSNhieu(listHT, Number($('#khLichPhut', box)?.value ?? 30));
      toast(`Em đã gói ${listHT.length} kế hoạch — mở file rồi bấm "Thêm tất cả" để iPhone reo đúng giờ từng việc ạ.`, 'ok', 5600);
    });

    // Toggle Timeline / Văn bản — nạp bản chi tiết (AI chuẩn hóa) đã lưu
    let _daNapVb = false;
    $$('#khView button', box).forEach((b) => b.onclick = async () => {
      $$('#khView button', box).forEach((x) => x.classList.toggle('on', x === b));
      const vb = b.dataset.v === 'vanban';
      $('#khTimeline', box).style.display = vb ? 'none' : '';
      $('#khVanBan', box).style.display = vb ? '' : 'none';
      if (vb && !_daNapVb) {
        _daNapVb = true;
        try {
          const r = await rpc('fn_ke_hoach_ngay', { p_ngay: ngay });
          if (r?.van_ban) $('#khVbDoc', box).innerHTML = mdMini(r.van_ban);
        } catch {}
      }
    });
  } else {
    // TỔNG HỢP THEO TRẠNG THÁI: Hoàn thành / Đang thực hiện / Chưa làm — kiểm soát pending
    const ttCua = (k) => k.trang_thai === 'DA_THUC_HIEN' ? 'xong' : (k.ket_qua ? 'dang' : 'chua');
    const demTT = { xong: 0, dang: 0, chua: 0 };
    ds.filter((k) => k.trang_thai !== 'DA_HUY').forEach((k) => demTT[ttCua(k)]++);
    if (!Object.keys(nhom).length) {
      box.innerHTML = `<div class="card mb0"><p class="muted mb0">${MC.chuaCoKeHoach}</p></div>`;
    } else {
      box.innerHTML = `
        <div class="tag-count" style="margin-bottom:12px">
          <span class="tagc on" data-tt="all">Tất cả <b>${demTT.xong + demTT.dang + demTT.chua}</b></span>
          <span class="tagc" data-tt="xong">${ic('check')} Hoàn thành <b>${demTT.xong}</b></span>
          <span class="tagc" data-tt="dang">${ic('clock')} Đang làm <b>${demTT.dang}</b></span>
          <span class="tagc miss" data-tt="chua">${ic('alert')} Chưa làm <b>${demTT.chua}</b></span>
          <span class="tagc" id="tcCopy">${ic('copy')} Sao chép</span>
        </div>` +
        Object.entries(nhom).map(([d, arr]) => `
        <div class="card kh-ngay-card">
          <h2 class="card-title">${ic('calendar')} ${fmtNgay(d)}${d === ngayHN ? ' <span class="badge badge-acc">Hôm nay</span>' : ''}</h2>
          ${arr.map((k) => `<div class="kh-tt-wrap" data-tt="${ttCua(k)}">${veItem(k, ttCua(k))}</div>`).join('')}
        </div>`).join('');
      box.lastElementChild?.classList.add('mb0');
      // Sao chép tổng hợp (theo bộ lọc đang chọn) — dán sang Sheets/Zalo lưu hồ sơ
      $('#tcCopy', box) && ($('#tcCopy', box).onclick = async (e) => {
        e.stopPropagation();
        const f = box.querySelector('.tag-count .tagc.on')?.dataset.tt || 'all';
        const tenTT = { xong: 'Hoàn thành', dang: 'Đang thực hiện', chua: 'Chưa thực hiện' };
        const dong = [`TỔNG HỢP CÔNG VIỆC ${tu.split('-').reverse().join('/')} → ${den.split('-').reverse().join('/')}`, ''];
        Object.entries(nhom).forEach(([d, arr]) => {
          const loc = arr.filter((k) => f === 'all' || ttCua(k) === f);
          if (!loc.length) return;
          dong.push(`■ ${fmtNgay(d)}`);
          loc.forEach((k) => dong.push(
            `  - ${fmtGio(k.thoi_gian)} ${k.tieu_de}${k.dia_diem ? ' · ' + k.dia_diem : ''} [${tenTT[ttCua(k)]}]${k.ket_qua ? ' — ' + k.ket_qua : ''}`));
          dong.push('');
        });
        try { await navigator.clipboard.writeText(dong.join('\n')); toast('Em đã sao chép bản tổng hợp ạ.'); }
        catch { toast('Không sao chép được, anh/chị thử lại ạ.', 'err'); }
      });
      // Lọc theo trạng thái
      $$('.tag-count .tagc:not(#tcCopy)', box).forEach((b) => b.onclick = () => {
        $$('.tag-count .tagc:not(#tcCopy)', box).forEach((x) => x.classList.toggle('on', x === b));
        const f = b.dataset.tt;
        $$('.kh-tt-wrap', box).forEach((w) => w.classList.toggle('hidden', f !== 'all' && w.dataset.tt !== f));
        $$('.kh-ngay-card', box).forEach((c) =>
          c.classList.toggle('hidden', ![...c.querySelectorAll('.kh-tt-wrap')].some((w) => !w.classList.contains('hidden'))));
      });
    }
  }

  $$('[data-open]', box).forEach((el) => el.onclick = () => {
    const k = ds.find((x) => String(x.id) === el.dataset.open);
    if (k) moChiTiet(k, reload);
  });

  const now = box.querySelector('.timeplan .tp-now');
  if (now) setTimeout(() => now.scrollIntoView({ behavior: 'smooth', block: 'center' }), 260);
}

// ---------- Item trong list ----------
function veItem(k, tt = null) {
  const badge = tt === 'xong' ? '<span class="badge badge-acc" style="font-size:10.5px">Hoàn thành</span>'
    : tt === 'dang' ? '<span class="badge badge-gold" style="font-size:10.5px">Đang làm</span>'
    : tt === 'chua' ? '<span class="badge badge-warn" style="font-size:10.5px">Chưa làm</span>' : '';
  return `
    <div class="list-item" data-open="${k.id}" style="cursor:pointer">
      <span class="badge badge-gold mono">${fmtGio(k.thoi_gian)}</span>
      <div class="list-main">
        <div class="list-title">${esc(k.tieu_de)}</div>
        <div class="list-sub">${k.dia_diem ? esc(k.dia_diem) + ' · ' : ''}${k.ket_qua ? esc(String(k.ket_qua).slice(0, 60)) : 'nhắc trước ' + k.nhac_truoc_phut + '′'}</div>
      </div>
      ${badge}${ic('chevron', 'ic-xs')}
    </div>`;
}

// ---------- Kế hoạch → BẢN VĂN BẢN gọn (1 cấp bullet theo giờ) ----------
export function keHoachSangVanBan(list, diChuyen = []) {
  const muc = [];
  list.forEach((k) => muc.push({ t: k.thoi_gian, s: `${fmtGio(k.thoi_gian)} ${k.tieu_de}${k.dia_diem ? ' · ' + k.dia_diem : ''}` }));
  diChuyen.forEach((d) => muc.push({ t: d.thoi_gian || d.gio, s: `${d.gio ? fmtGio(d.gio) + ' ' : ''}Di chuyển: ${d.dia_diem || ''}`.trim() }));
  muc.sort((a, b) => new Date(a.t) - new Date(b.t));
  if (!muc.length) return '_Chưa có mục nào._';
  return '**Kế hoạch trong ngày**\n' + muc.map((m) => `- ${m.s}`).join('\n');
}

// ---------- Timeline thông minh: chỉ hiện MỐC THỰC TẾ ----------
// Không liệt kê mọi giờ. Gom kế hoạch + di chuyển thành các mốc
// theo thời gian, nối bằng một trục dọc. Chèn "Bây giờ" đúng vị trí.
export function veHourline(list, diChuyen, isToday) {
  const phut = (iso) => {
    const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).formatToParts(new Date(iso));
    return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
  };
  const phutStr = (s) => { const [h, m] = String(s).split(':'); return Number(h) * 60 + Number(m || 0); };
  const hhmm = (iso) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

  // Gộp thành 1 danh sách mốc
  const moc = [
    ...list.map((k) => {
      return { p: phut(k.thoi_gian), gio: hhmm(k.thoi_gian),
        loai: 'plan',
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
        </div>
      </div>
    </div>`);
  });
  chenNow(); // nếu giờ hiện tại muộn hơn mọi mốc

  return `<div class="timeplan">${rows.join('')}</div>`;
}

// ---------- Sheet chi tiết ----------
export function moChiTiet(k, reload) {
  const p = (n) => String(n).padStart(2, '0');
  const local = () => {
    const d = new Date(k.thoi_gian);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const sh = openSheet(`
    <h3>${ic('calendar')} Chi tiết kế hoạch</h3>
    <div class="field"><label>Việc gì</label>
      <input class="input" id="ktTd" value="${esc(k.tieu_de)}"></div>
    <div class="field doi-ngay"><label>${ic('calendar')} Thời gian — dời sang ngày khác</label>
      <div class="ngaygio-row">
        <input class="input input-acc" type="date" id="ktNgay" value="${local().slice(0, 10)}">
        <input class="input" type="time" id="ktGio" value="${local().slice(11, 16)}">
      </div>
      <p class="muted" style="font-size:12.5px;margin:6px 0 0">Chọn ngày mới; giờ mặc định theo công việc, chỉnh nếu cần ạ.</p></div>
    <div class="field"><label>Nhắc trước</label>
        <select class="input" id="ktNh">
          ${[0, 15, 30, 60, 120].map((m) => `<option value="${m}" ${m === k.nhac_truoc_phut ? 'selected' : ''}>${m === 0 ? 'Đúng giờ' : m + ' phút'}</option>`).join('')}
        </select></div>
    <div class="field"><label>Địa điểm</label>
      <input class="input" id="ktDd" value="${esc(k.dia_diem || '')}"></div>
    <button class="btn btn-primary" id="ktLuu">${ic('edit')} Lưu sửa đổi</button>
    <button class="btn btn-quiet mt" id="ktLich">${ic('bell')} Cài vào Lịch iPhone (reo báo thức)</button>
    <button class="btn btn-danger mt" id="ktHuy">${ic('x')} Xóa kế hoạch</button>
    <p class="muted" style="font-size:12.5px;margin:10px 0 0;text-align:center">${ic('bell', 'ic-xs')} Nhắc trong app đã đặt tự động. Muốn iPhone REO to như báo thức thì bấm "Cài vào Lịch iPhone" ạ.</p>`);

  const dong = () => { closeSheet(); reload(); };

  $('#ktLich', sh) && ($('#ktLich', sh).onclick = () => {
    const ngay = $('#ktNgay', sh).value, gio = $('#ktGio', sh).value;
    taoICS({
      tieu_de: $('#ktTd', sh).value.trim() || k.tieu_de,
      thoi_gian: new Date(`${ngay}T${gio}`).toISOString(),
      dia_diem: $('#ktDd', sh).value.trim() || k.dia_diem || '',
      nhac_truoc_phut: Number($('#ktNh', sh).value ?? 0),
    });
    toast('Em đã tạo file lịch — bấm "Thêm tất cả" để iPhone lưu vào Lịch và reo đúng giờ ạ.', 'ok', 5200);
  });

  $('#ktLuu', sh) && ($('#ktLuu', sh).onclick = () => busy($('#ktLuu', sh), async () => {
    const td = $('#ktTd', sh).value.trim();
    const ngay = $('#ktNgay', sh).value, gio = $('#ktGio', sh).value;
    if (!td || !ngay || !gio) { toast('Anh/chị cho em xin tên việc, ngày và giờ ạ.', 'err'); return; }
    try {
      await rpc('fn_sua_ke_hoach', { p_id: k.id, p_thay_doi: {
        tieu_de: td, thoi_gian: new Date(`${ngay}T${gio}`).toISOString(),
        dia_diem: $('#ktDd', sh).value.trim() || null,
        nhac_truoc_phut: Number($('#ktNh', sh).value),
      }});
      toast('Em đã cập nhật kế hoạch ạ.'); dong();
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
}

function formThem(reload) {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date(Date.now() + 3600e3);
  const mac = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
  const sh = openSheet(`
    <h3>${ic('calendar')} Thêm kế hoạch</h3>
    <div class="field"><label>Việc gì</label>
      <input class="input" id="fkTd" placeholder="Vd: Họp nhà cung cấp vải"></div>
    <div class="field"><label>Thời gian</label>
      <input class="input" type="datetime-local" id="fkTg" value="${mac}"></div>
    <div class="field"><label>Nhắc trước</label>
        <select class="input" id="fkNh">
          <option value="15">15 phút</option><option value="30" selected>30 phút</option>
          <option value="60">1 giờ</option><option value="120">2 giờ</option>
        </select></div>
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


// ---------- Xuất file .ics (cài vào Lịch iPhone, reo báo thức đúng giờ) ----------
function taoICS({ tieu_de, thoi_gian, dia_diem = '', nhac_truoc_phut = 0, mo_ta = '' }) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = new Date(thoi_gian);
  const end = new Date(start.getTime() + 30 * 60000);
  const uid = 'cv-' + start.getTime() + '@nonson';
  const esc2 = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cong viec//NonSon//VI', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
    `SUMMARY:${esc2(tieu_de)}`,
    dia_diem ? `LOCATION:${esc2(dia_diem)}` : '',
    mo_ta ? `DESCRIPTION:${esc2(mo_ta)}` : '',
    'BEGIN:VALARM', `TRIGGER:-PT${Number(nhac_truoc_phut) || 0}M`, 'ACTION:DISPLAY',
    `DESCRIPTION:${esc2(tieu_de)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${(tieu_de || 'ke-hoach').slice(0, 40)}.ics`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}

// Xuất MỘT file .ics chứa NHIỀU kế hoạch — thêm 1 lần, iPhone reo từng việc
function taoICSNhieu(list, nhacPhut = null) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc2 = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const events = list.map((k) => {
    const start = new Date(k.thoi_gian);
    const end = new Date(start.getTime() + 30 * 60000);
    return [
      'BEGIN:VEVENT', `UID:cv-${k.id}-${start.getTime()}@nonson`, `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
      `SUMMARY:${esc2(k.tieu_de)}`,
      k.dia_diem ? `LOCATION:${esc2(k.dia_diem)}` : '',
      'BEGIN:VALARM', `TRIGGER:-PT${nhacPhut != null ? nhacPhut : (Number(k.nhac_truoc_phut) || 0)}M`, 'ACTION:DISPLAY',
      `DESCRIPTION:${esc2(k.tieu_de)}`, 'END:VALARM', 'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  }).join('\r\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cong viec//NonSon//VI',
    'CALSCALE:GREGORIAN', events, 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ke-hoach-ngay.ics';
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}
