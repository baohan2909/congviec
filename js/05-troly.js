// ============================================================
// CÔNG VIỆC — 05-troly.js
// Trợ lý cá nhân agentic: AI SOẠN → NGƯỜI DUYỆT → RPC GHI
// ============================================================
import { SYS, AI_GATEWAY, MC, loiNguoi } from './00-config.js';
import { rpc, phien, uploadAnh } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, rung } from './03-ui.js';
import { openRecorder } from './04-voice.js';

// ---------- Gọi Edge Function ----------
export async function goiTroLy(text, mode = 'troly') {
  const res = await fetch(AI_GATEWAY(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SYS.SUPA_ANON, Authorization: `Bearer ${SYS.SUPA_ANON}` },
    body: JSON.stringify({ token: phien.token(), mode, text }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('PHIEN_HET_HAN');
    throw new Error('AI_LOI');
  }
  return res.json(); // { luot_id, text, tool_calls }
}

// ---------- Nhãn hiển thị từng công cụ ----------
const LABEL = {
  cap_nhat_checkin: { icon: 'pin',      ten: 'Nơi làm việc hôm nay' },
  them_di_chuyen:   { icon: 'car',      ten: 'Di chuyển trong ngày' },
  tao_bao_cao:      { icon: 'file',     ten: 'Báo cáo công việc' },
  tao_ke_hoach:     { icon: 'calendar', ten: 'Kế hoạch' },
  tao_nhac_viec:    { icon: 'bell',     ten: 'Nhắc việc' },
};
const TEN_LOAI = { VAN_PHONG: 'Làm việc tại văn phòng', LAM_O_NHA: 'Làm việc tại nhà', CONG_TAC: 'Công tác', NGHI_PHEP: 'Nghỉ phép' };

const toLocalInput = (iso) => {
  try {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return ''; }
};

// ---------- Dựng form xem trước cho từng tool ----------
function pvBlock(tc, idx) {
  const meta = LABEL[tc.name];
  if (!meta) return '';
  const i = tc.input || {};
  let body = '';
  if (tc.name === 'cap_nhat_checkin') {
    body = `
      <div class="pv-field"><label>Trạng thái</label>
        <select class="input" data-f="loai">
          ${Object.entries(TEN_LOAI).map(([k, v]) =>
            `<option value="${k}" ${k === i.loai ? 'selected' : ''}>${v}</option>`).join('')}
        </select></div>
      <div class="pv-field"><label>Địa điểm ${i.loai === 'CONG_TAC' ? '(bắt buộc)' : ''}</label>
        <input class="input" data-f="dia_diem" value="${esc(i.dia_diem || '')}" placeholder="Nơi làm việc / công tác"></div>
      <div class="pv-field"><label>Ghi chú</label>
        <input class="input" data-f="ghi_chu" value="${esc(i.ghi_chu || '')}"></div>`;
  } else if (tc.name === 'them_di_chuyen') {
    body = `
      <div class="row">
        <div class="pv-field" style="flex:0 0 120px"><label>Giờ</label>
          <input class="input" type="time" data-f="gio" value="${esc(i.gio || '')}"></div>
        <div class="pv-field" style="flex:1"><label>Đến đâu</label>
          <input class="input" data-f="dia_diem" value="${esc(i.dia_diem || '')}"></div>
      </div>
      <div class="pv-field"><label>Lý do</label>
        <input class="input" data-f="ly_do" value="${esc(i.ly_do || '')}"></div>`;
  } else if (tc.name === 'tao_bao_cao') {
    body = `
      <div class="pv-field"><label>Nội dung báo cáo (em đã chuẩn hóa, có thể sửa trực tiếp)</label>
        <textarea class="input" data-f="noi_dung" style="min-height:190px">${esc(i.noi_dung || '')}</textarea></div>
      <label class="pv-check"><input type="checkbox" data-f="co_van_de" ${i.co_van_de ? 'checked' : ''}>
        Có vấn đề phát sinh cần Ban Quản trị lưu ý</label>`;
  } else if (tc.name === 'tao_ke_hoach') {
    body = `
      <div class="pv-field"><label>Việc gì</label>
        <input class="input" data-f="tieu_de" value="${esc(i.tieu_de || '')}"></div>
      <div class="row">
        <div class="pv-field" style="flex:1.3"><label>Thời gian</label>
          <input class="input" type="datetime-local" data-f="thoi_gian" value="${toLocalInput(i.thoi_gian)}"></div>
        <div class="pv-field" style="flex:1"><label>Nhắc trước</label>
          <select class="input" data-f="nhac_truoc_phut">
            ${[15, 30, 60, 120].map((m) => `<option value="${m}" ${m === (i.nhac_truoc_phut || 30) ? 'selected' : ''}>${m} phút</option>`).join('')}
          </select></div>
      </div>
      <div class="pv-field"><label>Địa điểm</label>
        <input class="input" data-f="dia_diem" value="${esc(i.dia_diem || '')}"></div>`;
  } else if (tc.name === 'tao_nhac_viec') {
    body = `
      <div class="pv-field"><label>Nhắc nội dung</label>
        <input class="input" data-f="noi_dung" value="${esc(i.noi_dung || '')}"></div>
      <div class="pv-field"><label>Vào lúc</label>
        <input class="input" type="datetime-local" data-f="lich_gui" value="${toLocalInput(i.lich_gui)}"></div>`;
  }
  return `
    <div class="pv-block" data-idx="${idx}" data-tool="${tc.name}">
      <div class="row" style="justify-content:space-between">
        <span class="pv-kind">${ic(meta.icon)} ${meta.ten}</span>
        <label class="pv-check" style="margin:0"><input type="checkbox" class="pv-on" checked> Gửi</label>
      </div>
      ${body}
    </div>`;
}

// ---------- Đọc lại giá trị đã sửa ----------
function docBlock(block) {
  const out = {};
  $$('[data-f]', block).forEach((el) => {
    out[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return out;
}

const toISO = (local) => (local ? new Date(local).toISOString() : null);

// ---------- Thực thi từng tool bằng RPC ----------
async function thucThi(name, v, extra) {
  if (name === 'cap_nhat_checkin')
    return rpc('fn_checkin', { p_loai: v.loai, p_dia_diem: v.dia_diem || null, p_ghi_chu: v.ghi_chu || null });
  if (name === 'them_di_chuyen')
    return rpc('fn_them_di_chuyen', { p_gio: v.gio, p_dia_diem: v.dia_diem, p_ly_do: v.ly_do || null });
  if (name === 'tao_bao_cao') {
    let audio_path = null;
    if (extra?.audioBlob) {
      try { audio_path = await uploadAnh(extra.audioBlob, 'webm'); } catch {}
    }
    let anh = extra?.anh || [];
    if (extra?.getAnh) { try { anh = await extra.getAnh(); } catch {} }
    return rpc('fn_gui_bao_cao', {
      p_noi_dung: v.noi_dung, p_noi_dung_goc: extra?.goc || null,
      p_co_van_de: !!v.co_van_de, p_audio_path: audio_path,
      p_anh: anh,
    });
  }
  if (name === 'tao_ke_hoach')
    return rpc('fn_tao_ke_hoach', {
      p_tieu_de: v.tieu_de, p_thoi_gian: toISO(v.thoi_gian),
      p_dia_diem: v.dia_diem || null, p_mo_ta: null,
      p_nhac_truoc_phut: Number(v.nhac_truoc_phut) || 30, p_nguon: 'AI_TRICH',
    });
  if (name === 'tao_nhac_viec')
    return rpc('fn_tao_ke_hoach', {
      p_tieu_de: v.noi_dung, p_thoi_gian: toISO(v.lich_gui),
      p_dia_diem: null, p_mo_ta: 'Nhắc việc', p_nhac_truoc_phut: 0, p_nguon: 'AI_TRICH',
    });
}

// ============================================================
// LUỒNG CHÍNH: nói/gõ → AI → sheet xem trước → Xác nhận
//   extra: { goc, audioBlob, anh: [{path,thu_tu}], onSaved }
// ============================================================
export async function xuLyVoiTroLy(text, mode = 'troly', extra = {}) {
  if (!text?.trim()) return;
  const sh = openSheet(`
    <h3>${ic('sparkle')} ${MC.troLyCua(phien.nd().ten_goi)}</h3>
    <p class="muted">${MC.dangXuLy}</p>
    <div class="skeleton" style="height:90px"></div>
    <div class="skeleton mt" style="height:56px"></div>`);

  let data;
  try { data = await goiTroLy(text, mode); }
  catch (e) { closeSheet(); toast(loiNguoi(e), 'err'); return; }

  const calls = data.tool_calls || [];
  if (!calls.length || (calls.length === 1 && calls[0].name === 'tra_loi')) {
    const reply = calls[0]?.input?.noi_dung || data.text || 'Em đã nghe rồi ạ.';
    sh.innerHTML = `<div class="sheet-grip"></div>
      <h3>${ic('sparkle')} ${MC.troLyCua(phien.nd().ten_goi)}</h3>
      <div class="pv-block">${esc(reply).replace(/\n/g, '<br>')}</div>
      <button class="btn btn-quiet mt" onclick="document.querySelector('#sheetBack')?.click()">Đóng</button>`;
    return;
  }

  const blocks = calls
    .map((c, i) => (c.name === 'tra_loi' ? '' : pvBlock(c, i)))
    .join('');
  sh.innerHTML = `<div class="sheet-grip"></div>
    <h3>${ic('sparkle')} ${MC.troLyCua(phien.nd().ten_goi)}</h3>
    <p class="muted mb0">${esc(data.text || MC.xemGiup)}</p>
    ${blocks}
    <div class="row mt">
      <button class="btn btn-quiet" id="pvHuy">${ic('x')} Bỏ qua</button>
      <button class="btn btn-gold" id="pvOK">${ic('check')} Xác nhận</button>
    </div>`;

  $('#pvHuy', sh).onclick = closeSheet;
  $('#pvOK', sh).onclick = () =>
    busy($('#pvOK', sh), async () => {
      const chon = $$('.pv-block', sh).filter((b) => $('.pv-on', b).checked);
      if (!chon.length) { closeSheet(); return; }
      let loi = 0;
      for (const b of chon) {
        try { await thucThi(b.dataset.tool, docBlock(b), extra); }
        catch (e) { loi++; toast(loiNguoi(e), 'err', 4200); }
      }
      if (data.luot_id) rpc('fn_xac_nhan_tro_ly', { p_luot_id: data.luot_id }).catch(() => {});
      if (!loi) { rung(18); toast(MC.daLuuChung); }
      closeSheet();
      extra.onSaved?.();
    });
}

// ============================================================
// moGhiAm: luồng ghi âm hoàn chỉnh dùng chung mọi màn hình
//   ➤ Gửi ngay  → thẳng vào AI
//   ⏸ Tạm dừng → sheet xem/sửa văn bản thô, nói tiếp hoặc gửi
// ============================================================
export function moGhiAm(mode = 'troly', extra = {}) {
  openRecorder({
    startText: extra.startText || '',
    onDone: ({ action, text, audioBlob }) => {
      if (action === 'cancel') return;
      if (audioBlob) extra.audioBlob = audioBlob;

      if (action === 'send') {
        if (!text) { toast(MC.khongNhanGiongNoi, 'err', 4200); return; }
        extra.goc = text;
        xuLyVoiTroLy(text, mode, extra);
        return;
      }

      // ---- Tạm dừng: xem lại văn bản thô ----
      const sh = openSheet(`
        <h3>${ic('edit')} Nội dung anh/chị vừa nói</h3>
        <p class="muted mb0">Anh/chị xem lại, sửa trực tiếp nếu cần, hoặc bấm mic nói tiếp ạ.</p>
        <textarea class="input mt" id="rvText" style="min-height:180px"
          placeholder="Nội dung sẽ hiện ở đây…">${esc(text)}</textarea>
        <div class="row mt">
          <button class="btn btn-quiet" id="rvMore">${ic('mic')} Nói tiếp</button>
          <button class="btn btn-gold" id="rvSend">${ic('sparkle')} Gửi cho trợ lý</button>
        </div>`);
      $('#rvMore', sh).onclick = () => {
        const t = $('#rvText', sh).value;
        closeSheet();
        moGhiAm(mode, { ...extra, startText: t });
      };
      $('#rvSend', sh).onclick = () => {
        const t = $('#rvText', sh).value.trim();
        if (!t) return;
        closeSheet();
        extra.goc = t;
        xuLyVoiTroLy(t, mode, extra);
      };
    },
  });
}
