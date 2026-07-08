// ============================================================
// CÔNG VIỆC — 05-troly.js  (Trợ lý 2.0)
// Nguyên tắc mới theo yêu cầu Aroma:
//  · Việc AN TOÀN (check-in, di chuyển, kế hoạch, nhắc) →
//    trợ lý XỬ LÝ NGAY, hiện thẻ "Em đã xử lý" + Hoàn tác.
//  · BÁO CÁO (trình BQT) → xem trước, đối chiếu từng kế hoạch,
//    kế hoạch thiếu bị đòi phản hồi, rồi mới Xác nhận gửi.
// ============================================================
import { SYS, AI_GATEWAY, MC, loiNguoi } from './00-config.js';
import { rpc, phien, uploadAnh } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, fmtNgayGio, rung } from './03-ui.js';
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
  return res.json(); // { luot_id, text, tool_calls, ke_hoach_cho }
}

const TEN_TT = { HOAN_THANH: 'Hoàn thành', DANG_LAM: 'Đang thực hiện', CHUA_LAM: 'Chưa thực hiện', HUY: 'Hủy kế hoạch' };
const toLocalInput = (iso) => {
  try {
    const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return ''; }
};
const toISO = (local) => (local ? new Date(local).toISOString() : null);

// ============================================================
// THỰC THI NGAY các công cụ an toàn → trả mô tả + hàm hoàn tác
// ============================================================
async function thucThiAuto(tc) {
  const i = tc.input || {};
  if (tc.name === 'cap_nhat_checkin') {
    const r = await rpc('fn_checkin', { p_loai: i.loai, p_dia_diem: i.dia_diem || null, p_ghi_chu: i.ghi_chu || null });
    return { icon: 'pin', mota: `Đã chấm nơi làm việc hôm nay${i.dia_diem ? ` — ${i.dia_diem}` : ''}`, sua: 'homnay' };
  }
  if (tc.name === 'them_di_chuyen') {
    const r = await rpc('fn_them_di_chuyen', { p_gio: i.gio, p_dia_diem: i.dia_diem, p_ly_do: i.ly_do || null });
    return { icon: 'car', mota: `Đã ghi di chuyển ${i.gio} — ${i.dia_diem}`,
      undo: () => rpc('fn_xoa_di_chuyen', { p_id: r.id }) };
  }
  if (tc.name === 'tao_ke_hoach') {
    const r = await rpc('fn_tao_ke_hoach', {
      p_tieu_de: i.tieu_de, p_thoi_gian: i.thoi_gian,
      p_dia_diem: i.dia_diem || null, p_mo_ta: i.mo_ta || null,
      p_nhac_truoc_phut: Number(i.nhac_truoc_phut) || 30, p_nguon: 'AI_TRICH',
    });
    return { icon: 'calendar', mota: `Đã lên kế hoạch: ${i.tieu_de} — ${fmtNgayGio(i.thoi_gian)}`,
      undo: () => rpc('fn_cap_nhat_ke_hoach', { p_id: r.id, p_trang_thai: 'DA_HUY' }) };
  }
  if (tc.name === 'tao_nhac_viec') {
    const r = await rpc('fn_tao_ke_hoach', {
      p_tieu_de: i.noi_dung, p_thoi_gian: i.lich_gui,
      p_dia_diem: null, p_mo_ta: 'Nhắc việc', p_nhac_truoc_phut: 0, p_nguon: 'AI_TRICH',
    });
    return { icon: 'bell', mota: `Sẽ nhắc: ${i.noi_dung} — ${fmtNgayGio(i.lich_gui)}`,
      undo: () => rpc('fn_cap_nhat_ke_hoach', { p_id: r.id, p_trang_thai: 'DA_HUY' }) };
  }
  return null;
}

// ============================================================
// LUỒNG CHÍNH
//   extra: { goc, audioBlob, getAnh, onSaved }
// ============================================================
export async function xuLyVoiTroLy(text, mode = 'troly', extra = {}) {
  if (!text?.trim()) return;
  const tenGoi = phien.nd().ten_goi;
  const sh = openSheet(`
    <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
    <p class="muted">${MC.dangXuLy}</p>
    <div class="skeleton" style="height:90px"></div>
    <div class="skeleton mt" style="height:56px"></div>`);

  let data;
  try { data = await goiTroLy(text, mode); }
  catch (e) { closeSheet(); toast(loiNguoi(e), 'err'); return; }

  const calls = data.tool_calls || [];
  const bcCall = calls.find((c) => c.name === 'tao_bao_cao');
  const autoCalls = calls.filter((c) => !['tao_bao_cao', 'tra_loi'].includes(c.name));
  const traLoi = calls.find((c) => c.name === 'tra_loi')?.input?.noi_dung;

  // ---- Chỉ trò chuyện ----
  if (!bcCall && !autoCalls.length) {
    sh.innerHTML = `<div class="sheet-grip"></div>
      <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
      <div class="pv-block">${esc(traLoi || data.text || 'Em đã nghe rồi ạ.').replace(/\n/g, '<br>')}</div>
      <button class="btn btn-quiet mt" id="tlDong">Đóng</button>`;
    $('#tlDong', sh).onclick = closeSheet;
    return;
  }

  // ---- 1) XỬ LÝ NGAY các việc an toàn ----
  const daLam = [];
  for (const tc of autoCalls) {
    try {
      const kq = await thucThiAuto(tc);
      if (kq) daLam.push(kq);
    } catch (e) {
      daLam.push({ icon: 'alert', loi: true, mota: `${loiNguoi(e)}` });
    }
  }
  if (data.luot_id) rpc('fn_xac_nhan_tro_ly', { p_luot_id: data.luot_id }).catch(() => {});
  if (daLam.length && !daLam.some((d) => d.loi)) rung(18);

  const doneHTML = daLam.length ? `
    <div class="pv-block done-card" style="border-color:var(--acc-line)">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${ic('check')} Em đã xử lý ngay:</div>
      ${daLam.map((d, i) => `
        <div class="done-item" data-i="${i}">
          ${ic(d.icon)}<span style="flex:1">${esc(d.mota)}</span>
          ${d.undo ? `<button class="undo" data-undo="${i}">${ic('undo')} Hoàn tác</button>` : ''}
        </div>`).join('')}
    </div>` : '';

  // ---- 2) Không có báo cáo → thẻ kết quả gọn ----
  if (!bcCall) {
    sh.innerHTML = `<div class="sheet-grip"></div>
      <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
      ${data.text ? `<p class="muted mb0">${esc(data.text)}</p>` : ''}
      ${doneHTML}
      <button class="btn btn-primary mt" id="tlXong">${ic('check')} Xong</button>`;
    gắnUndo(sh, daLam);
    $('#tlXong', sh).onclick = () => { closeSheet(); extra.onSaved?.(); };
    return;
  }

  // ---- 3) Có báo cáo → XEM TRƯỚC + ĐỐI CHIẾU KẾ HOẠCH ----
  const bi = bcCall.input || {};
  const khCho = data.ke_hoach_cho || [];
  const capNhat = Object.fromEntries((bi.ke_hoach_cap_nhat || []).map((k) => [k.id, k]));
  const thieuIds = new Set(bi.ke_hoach_thieu || []);

  const khRows = khCho.map((k) => {
    const cn = capNhat[k.id];
    const thieu = !cn;
    return `
      <div class="kh-row ${thieu ? 'thieu' : ''}" data-kh="${k.id}">
        <div class="kh-head">
          <span class="kh-time">${fmtNgayGio(k.thoi_gian)}</span>
          <span style="flex:1">${esc(k.tieu_de)}</span>
          ${thieu ? `<span class="kh-flag">${ic('alert')} Chưa có phản hồi</span>` : ''}
        </div>
        <select class="input kh-tt">
          <option value="">— Chọn kết quả —</option>
          ${Object.entries(TEN_TT).map(([v, t]) =>
            `<option value="${v}" ${cn?.trang_thai === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <input class="input kh-ph" placeholder="Phản hồi / kết quả cụ thể…" value="${esc(cn?.phan_hoi || '')}">
      </div>`;
  }).join('');

  sh.innerHTML = `<div class="sheet-grip"></div>
    <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
    ${data.text ? `<p class="muted mb0">${esc(data.text)}</p>` : ''}
    ${doneHTML}
    <div class="pv-block">
      <span class="pv-kind">${ic('file')} Báo cáo ngày</span>
      <textarea class="input" id="bcNoiDung" style="min-height:210px">${esc(bi.noi_dung || '')}</textarea>
      <label class="pv-check"><input type="checkbox" id="bcVanDe" ${bi.co_van_de ? 'checked' : ''}>
        Có vấn đề phát sinh cần Ban Quản trị lưu ý</label>
    </div>
    ${khCho.length ? `
      <div class="pv-block">
        <span class="pv-kind">${ic('calendar')} Đối chiếu kế hoạch (${khCho.length})</span>
        ${thieuIds.size || khCho.some((k) => !capNhat[k.id])
          ? `<p class="muted" style="font-size:13px;margin:6px 0 0">Kế hoạch viền vàng chưa có phản hồi trong báo cáo — ${esc(tenGoi)} chọn kết quả, bổ sung, hoặc hủy giúp em ạ.</p>` : ''}
        ${khRows}
      </div>` : ''}
    <div class="row mt">
      <button class="btn btn-quiet" id="pvNoiThem">${ic('mic')} Nói thêm</button>
      <button class="btn btn-primary" id="pvGui">${ic('send')} Gửi báo cáo</button>
    </div>
    <button class="btn btn-quiet mt" id="pvHuy">Bỏ qua báo cáo</button>`;

  gắnUndo(sh, daLam);
  $('#pvHuy', sh).onclick = () => { closeSheet(); extra.onSaved?.(); };
  $('#pvNoiThem', sh).onclick = () => {
    closeSheet();
    moGhiAm(mode, { ...extra, startText: text });
  };
  $('#pvGui', sh).onclick = () => busy($('#pvGui', sh), async () => {
    const noiDung = $('#bcNoiDung', sh).value.trim();
    if (!noiDung) { toast('Nội dung báo cáo đang trống ạ.', 'err'); return; }

    // Kế hoạch nào vẫn bỏ trống kết quả → chặn lại, đúng nghiệp vụ "không được bỏ sót"
    const rows = $$('.kh-row', sh);
    const boSot = rows.filter((r) => !$('.kh-tt', r).value);
    if (boSot.length) {
      boSot.forEach((r) => r.classList.add('thieu'));
      toast(`Còn ${boSot.length} kế hoạch chưa chọn kết quả ạ. Chọn xong em gửi ngay.`, 'err', 4600);
      boSot[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const keHoach = rows.map((r) => ({
      id: Number(r.dataset.kh),
      trang_thai: $('.kh-tt', r).value,
      phan_hoi: $('.kh-ph', r).value.trim() || null,
    }));

    try {
      let audio_path = null;
      if (extra.audioBlob) { try { audio_path = await uploadAnh(extra.audioBlob, 'webm'); } catch {} }
      let anh = [];
      if (extra.getAnh) { try { anh = await extra.getAnh(); } catch {} }
      await rpc('fn_gui_bao_cao_v2', {
        p_noi_dung: noiDung, p_noi_dung_goc: extra.goc || text || null,
        p_co_van_de: $('#bcVanDe', sh).checked, p_audio_path: audio_path,
        p_anh: anh, p_ke_hoach: keHoach,
      });
      rung(20); closeSheet(); toast(MC.daLuuBaoCao);
      extra.onSaved?.();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}

function gắnUndo(sh, daLam) {
  $$('.undo', sh).forEach((b) => b.onclick = () => busy(b, async () => {
    const d = daLam[Number(b.dataset.undo)];
    try {
      await d.undo();
      b.closest('.done-item').style.opacity = '.45';
      b.closest('.done-item').querySelector('span').style.textDecoration = 'line-through';
      b.remove();
      toast('Em đã hoàn tác rồi ạ.');
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
}

// ============================================================
// moGhiAm: luồng ghi âm dùng chung
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
      const sh = openSheet(`
        <h3>${ic('edit')} Nội dung anh/chị vừa nói</h3>
        <p class="muted mb0">Anh/chị xem lại, sửa trực tiếp nếu cần, hoặc bấm mic nói tiếp ạ.</p>
        <textarea class="input mt" id="rvText" style="min-height:180px">${esc(text)}</textarea>
        <div class="row mt">
          <button class="btn btn-quiet" id="rvMore">${ic('mic')} Nói tiếp</button>
          <button class="btn btn-primary" id="rvSend">${ic('sparkle')} Gửi cho trợ lý</button>
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
