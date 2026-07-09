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
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, fmtNgayGio, mdMini, rung } from './03-ui.js';
import { openRecorder } from './04-voice.js';
import { luuTam, xoaTam, danhDauLoi, layTam as layTamPub, xoaTam as xoaTamPub } from './08-luutam.js';

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
  if (tc.name === 'cap_nhat_cong_viec') {
    await rpc('fn_cap_nhat_cong_viec', { p_id: Number(i.id), p_thay_doi: {
      ...(Number.isFinite(Number(i.tien_do)) ? { tien_do: Number(i.tien_do) } : {}),
      ...(i.trang_thai ? { trang_thai: i.trang_thai } : {}),
      ghi_chu: i.ghi_chu || 'Cập nhật qua trợ lý',
    }});
    return { icon: 'briefcase',
      mota: `Đã cập nhật công việc${Number.isFinite(Number(i.tien_do)) ? ` — tiến độ ${i.tien_do}%` : ''}: ${i.ghi_chu || ''}` };
  }
  if (tc.name === 'sua_ke_hoach') {
    const kq = await rpc('fn_sua_ke_hoach', { p_id: Number(i.id), p_thay_doi: {
      ...(i.tieu_de ? { tieu_de: i.tieu_de } : {}),
      ...(i.thoi_gian ? { thoi_gian: i.thoi_gian } : {}),
      ...(i.dia_diem !== undefined ? { dia_diem: i.dia_diem } : {}),
      ...(Number.isFinite(Number(i.nhac_truoc_phut)) ? { nhac_truoc_phut: Number(i.nhac_truoc_phut) } : {}),
      ...(i.trang_thai ? { trang_thai: i.trang_thai } : {}),
    }});
    // dựng mô tả cụ thể "cái gì → cái gì"
    const cu = kq.cu, moi = kq.moi;
    const bo = [];
    if (cu.tieu_de !== moi.tieu_de) bo.push(`đổi tên "${cu.tieu_de}" → "${moi.tieu_de}"`);
    if (cu.thoi_gian !== moi.thoi_gian) bo.push(`dời giờ ${fmtNgayGio(cu.thoi_gian)} → ${fmtNgayGio(moi.thoi_gian)}`);
    if ((cu.dia_diem || '') !== (moi.dia_diem || '')) bo.push(`địa điểm → "${moi.dia_diem || 'không có'}"`);
    if (cu.trang_thai !== moi.trang_thai) bo.push(moi.trang_thai === 'DA_HUY' ? 'đã hủy' : moi.trang_thai === 'DA_THUC_HIEN' ? 'đánh dấu hoàn thành' : 'khôi phục');
    return { icon: 'edit',
      mota: `Kế hoạch "${moi.tieu_de}": ${bo.join(', ') || 'đã cập nhật'}`,
      undo: () => rpc('fn_sua_ke_hoach', { p_id: cu.id, p_thay_doi: {
        tieu_de: cu.tieu_de, thoi_gian: cu.thoi_gian, dia_diem: cu.dia_diem,
        nhac_truoc_phut: cu.nhac_truoc_phut, trang_thai: cu.trang_thai,
      }}) };
  }
  if (tc.name === 'sua_di_chuyen') {
    const kq = await rpc('fn_sua_di_chuyen', { p_id: Number(i.id), p_thay_doi: {
      ...(i.gio ? { gio: i.gio } : {}),
      ...(i.dia_diem ? { dia_diem: i.dia_diem } : {}),
      ...(i.ly_do !== undefined ? { ly_do: i.ly_do } : {}),
    }});
    const cu = kq.cu, moi = kq.moi;
    return { icon: 'car',
      mota: `Di chuyển ${cu.gio} ${cu.dia_diem} → ${moi.gio} ${moi.dia_diem}`,
      undo: () => rpc('fn_sua_di_chuyen', { p_id: cu.id, p_thay_doi: {
        gio: cu.gio, dia_diem: cu.dia_diem, ly_do: cu.ly_do,
      }}) };
  }
  if (tc.name === 'bo_sung_bao_cao') {
    await rpc('fn_bo_sung_bao_cao', { p_id: Number(i.id), p_noi_dung_them: i.noi_dung_them });
    // undo: không hoàn tác được text đã append (audit)
    return { icon: 'file',
      mota: `Đã bổ sung báo cáo hôm nay: "${(i.noi_dung_them || '').slice(0, 80)}"` };
  }
  if (tc.name === 'giao_viec') {
    const r = await rpc('fn_tao_cong_viec', {
      p_tieu_de: i.tieu_de, p_giao_cho: i.giao_cho, p_dang: i.dang,
      p_mo_ta: i.mo_ta || null, p_uu_tien: i.uu_tien || 'BINH_THUONG',
      p_han: i.han || null, p_chu_ky: i.chu_ky || null, p_moc: [],
    });
    return { icon: 'briefcase',
      mota: `Đã giao việc "${i.tieu_de}" cho ${i.giao_cho}${i.han ? ` — hạn ${fmtNgayGio(i.han)}` : ''}`,
      undo: () => rpc('fn_xoa_cong_viec_moi', { p_id: r }) };
  }
  if (tc.name === 'chot_cong_viec') {
    await rpc('fn_cap_nhat_cong_viec', { p_id: Number(i.id), p_thay_doi: {
      trang_thai: i.trang_thai,
      ...(i.trang_thai === 'HOAN_THANH' ? { tien_do: 100 } : {}),
      ghi_chu: i.ghi_chu || ({ HOAN_THANH: 'Hoàn thành', VUONG_MAC: 'Báo vướng mắc', DANG_LAM: 'Đang thực hiện' }[i.trang_thai]),
    }});
    return { icon: 'check',
      mota: `Công việc → ${({ HOAN_THANH: 'Hoàn thành', VUONG_MAC: 'Vướng mắc', DANG_LAM: 'Đang thực hiện' }[i.trang_thai])}${i.ghi_chu ? `: ${i.ghi_chu}` : ''}` };
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

  // AN TOÀN GIỌNG NÓI: giữ lại đoạn vừa nói trước khi gọi AI
  const _luuId = luuTam(text, mode, extra.meta || {});

  let data;
  try { data = await goiTroLy(text, mode); }
  catch (e) {
    danhDauLoi(_luuId); // giữ nguyên để khôi phục
    closeSheet();
    khoiPhucSau(text, mode, extra, loiNguoi(e));
    return;
  }

  const calls = data.tool_calls || [];
  const bcCall = calls.find((c) => c.name === 'tao_bao_cao');
  const khNgayCall = calls.find((c) => c.name === 'lap_ke_hoach_ngay');
  const traCuuCall = calls.find((c) => c.name === 'tra_cuu');
  const autoCalls = calls.filter((c) => !['tao_bao_cao', 'lap_ke_hoach_ngay', 'tra_cuu', 'tra_loi'].includes(c.name));
  const traLoi = calls.find((c) => c.name === 'tra_loi')?.input?.noi_dung;

  // ---- KẾ HOẠCH NGÀY: hiện SONG SONG bản văn bản + timeline xác nhận ----
  if (khNgayCall) {
    const bi = khNgayCall.input || {};
    const cvs = (bi.cong_viec || []).map((c, idx) => ({ ...c, _i: idx }));
    xemTruocKeHoachNgay(sh, bi, cvs, _luuId, extra);
    return;
  }

  // ---- TRA CỨU: gọi RPC lấy số liệu thật, hiện kết quả ----
  if (traCuuCall && !autoCalls.length && !bcCall) {
    xoaTam(_luuId);
    await xemTraCuu(sh, traCuuCall.input || {}, data.text);
    return;
  }

  // ---- Chỉ trò chuyện ----
  if (!bcCall && !autoCalls.length) {
    sh.innerHTML = `<div class="sheet-grip"></div>
      <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
      <div class="pv-block">${esc(traLoi || data.text || 'Em đã nghe rồi ạ.').replace(/\n/g, '<br>')}</div>
      <button class="btn btn-quiet mt" id="tlDong">Đóng</button>`;
    $('#tlDong', sh).onclick = closeSheet;
    xoaTam(_luuId); // trò chuyện xong, không có gì để mất
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
    xoaTam(_luuId); // việc an toàn đã thực thi + đã lưu vào hệ thống
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
      xoaTam(_luuId); // báo cáo đã lưu, an toàn xóa bản tạm
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



// ============================================================
// Xem trước KẾ HOẠCH NGÀY — 2 dạng song song:
//  · Bản văn bản bài bản (đọc)
//  · Timeline các mốc giờ (xác nhận / sửa / bỏ từng mục)
// Xác nhận xong mới tạo kế hoạch → vào tab Kế hoạch.
// ============================================================
function xemTruocKeHoachNgay(sh, bi, cvs, _luuId, extra) {
  const tenGoi = phien.nd().ten_goi;
  const veList = () => cvs.map((c) => `
    <div class="kh-item" data-i="${c._i}">
      <span class="badge badge-gold mono">${fmtNgayGio(c.thoi_gian)}</span>
      <div class="list-main">
        <input class="input kh-td" value="${esc(c.tieu_de)}" style="min-height:42px;font-weight:600">
        ${c.dia_diem ? `<div class="list-sub">${esc(c.dia_diem)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-quiet kh-bo" aria-label="Bỏ mục này">${ic('x')}</button>
    </div>`).join('');

  const draw = () => {
    sh.innerHTML = `<div class="sheet-grip"></div>
      <h3>${ic('sparkle')} Kế hoạch em vừa lập</h3>
      <div class="seg" id="khSeg">
        <button data-v="ban" class="on">Bản kế hoạch</button>
        <button data-v="tl">Dòng thời gian</button>
      </div>
      <div id="khViewBan" class="pv-block">
        <div class="md-doc">${mdMini(bi.van_ban || '')}</div>
      </div>
      <div id="khViewTl" class="hidden">
        ${cvs.length ? veList() : '<p class="muted">Không tách được mốc giờ nào ạ.</p>'}
      </div>
      <div class="row mt">
        <button class="btn btn-quiet" id="khNoiThem">${ic('mic')} Nói thêm</button>
        <button class="btn btn-primary" id="khXacNhan">${ic('check')} Xác nhận kế hoạch</button>
      </div>
      <p class="muted mt mb0" style="font-size:13px">Sau khi xác nhận, ${esc(cvs.length)} mục sẽ vào tab Kế hoạch và em nhắc đúng giờ ạ.</p>`;

    $$('#khSeg button', sh).forEach((b) => b.onclick = () => {
      $$('#khSeg button', sh).forEach((x) => x.classList.toggle('on', x === b));
      $('#khViewBan', sh).classList.toggle('hidden', b.dataset.v !== 'ban');
      $('#khViewTl', sh).classList.toggle('hidden', b.dataset.v !== 'tl');
    });
    $$('.kh-bo', sh).forEach((b) => b.onclick = () => {
      const i = Number(b.closest('.kh-item').dataset.i);
      const idx = cvs.findIndex((x) => x._i === i);
      if (idx >= 0) cvs.splice(idx, 1);
      draw();
      $$('#khSeg button', sh)[1].click();
    });
    $$('.kh-td', sh).forEach((inp) => inp.onchange = () => {
      const i = Number(inp.closest('.kh-item').dataset.i);
      const c = cvs.find((x) => x._i === i); if (c) c.tieu_de = inp.value;
    });
    $('#khNoiThem', sh).onclick = () => { closeSheet(); moGhiAm('troly', extra); };
    $('#khXacNhan', sh).onclick = () => busy($('#khXacNhan', sh), async () => {
      if (!cvs.length) { toast('Chưa có mục nào để lưu ạ.', 'err'); return; }
      try {
        for (const c of cvs) {
          await rpc('fn_tao_ke_hoach', {
            p_tieu_de: c.tieu_de, p_thoi_gian: c.thoi_gian,
            p_dia_diem: c.dia_diem || null, p_mo_ta: null,
            p_nhac_truoc_phut: Number(c.nhac_truoc_phut) || 30, p_nguon: 'AI_TRICH',
          });
        }
        xoaTam(_luuId);
        rung(20); closeSheet();
        toast(`Em đã lưu ${cvs.length} kế hoạch vào tab Kế hoạch ạ.`);
        extra.onSaved?.();
        window.cvGoTab?.('kehoach');
      } catch (e) { toast(loiNguoi(e), 'err'); }
    });
  };
  draw();
}


// ============================================================
// Tra cứu bằng lời: gọi RPC → trình bày kết quả gọn, bài bản
// ============================================================
async function xemTraCuu(sh, input, dan) {
  const tenGoi = phien.nd().ten_goi;
  sh.innerHTML = `<div class="sheet-grip"></div>
    <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
    <div class="skeleton" style="height:80px"></div>`;
  let r;
  try {
    r = await rpc('fn_troly_tra_cuu', {
      p_loai: input.loai, p_pham_vi: input.pham_vi || 'toi',
      p_tu_khoa: input.tu_khoa || null, p_ngay: null,
    });
  } catch (e) { sh.innerHTML = `<div class="sheet-grip"></div><p>${esc(loiNguoi(e))}</p>`; return; }

  let body = '';
  if (r?.loi === 'CAN_QUYEN_QUAN_LY') {
    body = '<p class="muted">Thông tin này chỉ dành cho Ban Quản lý ạ.</p>';
  } else {
    const ds = r?.ds || [];
    const tenLoai = {
      ai_chua_bao_cao: 'Chưa gửi báo cáo', ai_chua_checkin: 'Chưa chấm nơi làm việc',
      van_de_hom_nay: 'Vấn đề phát sinh hôm nay', cong_viec_tre: 'Công việc đang trễ hạn',
      cong_viec_cua: `Công việc ${input.tu_khoa ? '"' + input.tu_khoa + '"' : ''}`,
    }[r?.loai] || 'Kết quả';

    if (r?.loai === 'tom_tat_ngay') {
      body = `<div class="md-doc">
        <div class="md-sec">Tình hình hôm nay của ${esc(tenGoi)}</div>
        <ul class="md-ul">
          <li>Nơi làm việc: <b>${r.checkin ? esc(r.checkin.loai) + (r.checkin.dia_diem ? ' — ' + esc(r.checkin.dia_diem) : '') : 'chưa chấm'}</b></li>
          <li>Kế hoạch: <b>${r.so_ke_hoach || 0}</b> mục</li>
          <li>Báo cáo: <b>${r.da_bao_cao ? 'đã gửi' : 'chưa gửi'}</b></li>
          <li>Công việc đang phụ trách: <b>${r.so_cong_viec || 0}</b></li>
        </ul></div>`;
    } else if (!ds.length) {
      body = `<div class="pv-block"><b>${esc(tenLoai)}:</b> không có ai/mục nào ạ. ${r?.loai === 'ai_chua_bao_cao' || r?.loai === 'cong_viec_tre' ? 'Mọi thứ đang ổn.' : ''}</div>`;
    } else {
      const dong = ds.map((x, idx) => {
        if (r.loai === 'cong_viec_cua' || r.loai === 'cong_viec_tre') {
          return `<li><b>${esc(x.tieu_de)}</b>${x.tien_do != null ? ` — ${x.tien_do}%` : ''}${x.ten_nhan ? ` (${esc(x.ten_nhan)})` : ''}${x.cap_nhat_moi ? `<div class="tp-sub">${esc(x.cap_nhat_moi)}</div>` : ''}${x.han ? `<div class="tp-sub">Hạn ${fmtNgayGio(x.han)}</div>` : ''}</li>`;
        }
        if (r.loai === 'van_de_hom_nay') {
          return `<li><b>${esc(x.ho_ten)}</b><div class="tp-sub">${esc(String(x.noi_dung).replace(/[*#]/g, '').slice(0, 120))}</div></li>`;
        }
        return `<li><b>${esc(x.ho_ten)}</b>${x.ten_pb ? ` — ${esc(x.ten_pb)}` : ''}</li>`;
      }).join('');
      body = `<div class="md-doc"><div class="md-sec">${esc(tenLoai)} (${ds.length})</div><ol class="md-ol">${dong}</ol></div>`;
    }
  }

  sh.innerHTML = `<div class="sheet-grip"></div>
    <h3>${ic('sparkle')} ${MC.troLyCua(tenGoi)}</h3>
    ${dan ? `<p class="muted mb0">${esc(dan)}</p>` : ''}
    <div class="pv-block">${body}</div>
    <button class="btn btn-quiet mt" id="tcDong">Đóng</button>`;
  $('#tcDong', sh).onclick = closeSheet;
}

// ============================================================
// Khi AI lỗi giữa chừng: KHÔNG mất nội dung. Cho người dùng
// xem lại đoạn vừa nói + thử lại / copy / sửa tay.
// ============================================================
function khoiPhucSau(text, mode, extra, loi) {
  const sh = openSheet(`
    <h3>${ic('alert')} Trợ lý đang trục trặc</h3>
    <p class="muted mb0">${esc(loi || 'Có lỗi khi xử lý.')} — nhưng em vẫn giữ nguyên đoạn anh/chị vừa nói ạ, không mất đâu.</p>
    <div class="pv-block">
      <span class="pv-kind">${ic('mic')} Nội dung đã ghi</span>
      <textarea class="input" id="kpText" style="min-height:160px">${esc(text)}</textarea>
    </div>
    <div class="row mt">
      <button class="btn btn-quiet" id="kpCopy">${ic('file')} Sao chép</button>
      <button class="btn btn-primary" id="kpThuLai">${ic('undo')} Thử lại</button>
    </div>
    <p class="muted mt mb0" style="font-size:13px">Đoạn này được tự động giữ lại kể cả khi anh/chị thoát app — mở lại sẽ có nút khôi phục ạ.</p>`);
  $('#kpCopy', sh).onclick = async () => {
    try { await navigator.clipboard.writeText($('#kpText', sh).value); toast('Đã sao chép ạ.'); } catch {}
  };
  $('#kpThuLai', sh).onclick = () => {
    const t = $('#kpText', sh).value.trim();
    if (!t) return;
    closeSheet();
    xuLyVoiTroLy(t, mode, extra);
  };
}

// Kiểm tra bản còn kẹt khi mở app — gọi từ 99-app sau đăng nhập
export function kiemTraGiongNoiChoXuLy() {
  const b = layTamPub();
  if (!b) return;
  const sh = openSheet(`
    <h3>${ic('undo')} Khôi phục nội dung đã nói</h3>
    <p class="muted mb0">Lần trước có một đoạn anh/chị nói mà em chưa xử lý xong (${new Date(b.luc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}). Em vẫn giữ nguyên đây ạ:</p>
    <div class="pv-block"><div style="font-size:15px;white-space:pre-wrap">${esc(b.text)}</div></div>
    <div class="row mt">
      <button class="btn btn-quiet" id="kgBo">Bỏ qua</button>
      <button class="btn btn-primary" id="kgXuLy">${ic('sparkle')} Xử lý tiếp</button>
    </div>`);
  $('#kgBo', sh).onclick = () => { xoaTamPub(); closeSheet(); };
  $('#kgXuLy', sh).onclick = () => { closeSheet(); xuLyVoiTroLy(b.text, b.mode || 'troly', { meta: b.meta }); };
}
