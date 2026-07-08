// ============================================================
// CÔNG VIỆC — 15-tab-congviec.js
// Việc của tôi / Tôi giao · 2 dạng (thường xuyên / có thời hạn)
// Chi tiết 360: mốc timeline · dòng hoạt động · thống kê
// ============================================================
import { rpc, phien, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, toast, openSheet, closeSheet, busy, fmtNgayGio, fmtNgay, rung } from './03-ui.js';
import { moGhiAm } from './05-troly.js';

let seg = 'cua_toi';
const TEN_UT = { KHAN: 'Khẩn', CAO: 'Cao', BINH_THUONG: 'Bình thường', THAP: 'Thấp' };
const TEN_TT = { CHUA_LAM: 'Chưa bắt đầu', DANG_LAM: 'Đang thực hiện', CHO_DUYET: 'Chờ duyệt', HOAN_THANH: 'Hoàn thành', VUONG_MAC: 'Vướng mắc' };

export async function renderCongViec(root) {
  const laQL = phien.nd().vai_tro !== 'NHAN_VIEN';
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Công việc</h1>
        <p class="page-sub">Việc thường xuyên và việc có thời hạn của mình.</p></div>
    </div>
    ${laQL ? `
      <div class="seg">
        <button data-s="cua_toi" class="${seg === 'cua_toi' ? 'on' : ''}">Việc của tôi</button>
        <button data-s="toi_giao" class="${seg === 'toi_giao' ? 'on' : ''}">Tôi giao</button>
      </div>` : ''}
    ${laQL ? `<button class="btn btn-primary" id="cvThem" style="margin-bottom:14px">${ic('plus')} Giao việc mới</button>` : ''}
    <div id="cvList"><div class="skeleton" style="height:130px"></div></div>`;

  $$('.seg button', root).forEach((b) => b.onclick = () => { seg = b.dataset.s; renderCongViec(root); });
  if (laQL) $('#cvThem', root).onclick = () => formGiaoViec(() => renderCongViec(root));

  let d;
  try { d = await rpc('fn_ds_cong_viec'); }
  catch (e) { $('#cvList', root).innerHTML = `<div class="card">${esc(loiNguoi(e))}</div>`; return; }

  const ds = (laQL ? d[seg] : d.cua_toi) || [];
  const box = $('#cvList', root);
  if (!ds.length) {
    box.innerHTML = `<div class="card mb0"><p class="muted mb0">${
      seg === 'toi_giao' ? 'Anh/chị chưa giao việc nào ạ.' : 'Hiện chưa có việc nào được giao ạ. Nhẹ nhõm nhé!'}</p></div>`;
    return;
  }
  box.innerHTML = ds.map((cv) => theCV(cv, seg === 'toi_giao')).join('');
  box.lastElementChild?.classList.add('mb0');
  $$('[data-cv]', box).forEach((el) => el.onclick = () => mo360(Number(el.dataset.cv), () => renderCongViec(root)));
}

function theCV(cv, toiGiao) {
  const routine = cv.dang === 'THUONG_XUYEN';
  const qua = !routine && cv.han_hoan_thanh && new Date(cv.han_hoan_thanh) < new Date();
  return `
    <div class="card" data-cv="${cv.id}" style="cursor:pointer">
      <div class="row" style="align-items:flex-start">
        <div class="list-main">
          <div class="list-title" style="font-size:16px">${esc(cv.tieu_de)}</div>
          <div class="list-sub" style="margin-top:4px">
            ${routine
              ? `<span class="badge badge-acc">${ic('undo')} Thường xuyên</span>`
              : `<span class="badge ${qua ? 'badge-danger' : 'badge-gold'}">${ic('clock')} Hạn ${fmtNgayGio(cv.han_hoan_thanh)}</span>`}
            ${cv.uu_tien === 'KHAN' || cv.uu_tien === 'CAO'
              ? `<span class="badge badge-danger">${TEN_UT[cv.uu_tien]}</span>` : ''}
            ${toiGiao ? `<span class="badge badge-acc">${ic('user')} ${esc(cv.ten_nhan || cv.giao_cho)}</span>` : ''}
          </div>
        </div>
        <span class="badge ${cv.trang_thai === 'VUONG_MAC' ? 'badge-danger' : 'badge-acc'}">${TEN_TT[cv.trang_thai] || cv.trang_thai}</span>
      </div>
      ${!routine ? `
        <div style="margin-top:12px;height:8px;border-radius:99px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden">
          <div style="height:100%;width:${cv.tien_do || 0}%;background:var(--acc-grad);border-radius:99px"></div>
        </div>
        <div class="row" style="justify-content:space-between;margin-top:6px">
          <span class="mono muted" style="font-size:12px">${cv.tien_do || 0}%</span>
          ${cv.moc_tong > 0 ? `<span class="mono muted" style="font-size:12px">${cv.moc_xong}/${cv.moc_tong} mốc</span>` : ''}
        </div>` : ''}
    </div>`;
}

// ============ CHI TIẾT 360 ============
async function mo360(id, reload) {
  const sh = openSheet(`<h3>${ic('briefcase')} Chi tiết công việc</h3>
    <div class="skeleton" style="height:160px"></div>`);
  let d;
  try { d = await rpc('fn_cong_viec_360', { p_id: id }); }
  catch (e) { closeSheet(); toast(loiNguoi(e), 'err'); return; }

  const cv = d.cv, routine = cv.dang === 'THUONG_XUYEN';
  const tk = d.thong_ke || {};
  const conLai = cv.han_hoan_thanh
    ? Math.ceil((new Date(cv.han_hoan_thanh) - Date.now()) / 864e5) : null;

  // Dòng hoạt động 360: kế hoạch + phản hồi báo cáo + cập nhật, gộp theo thời gian
  const dong = [
    ...(d.ke_hoach || []).map((k) => ({
      t: k.thoi_gian, icon: 'calendar',
      tieu: k.tieu_de,
      phu: k.trang_thai === 'DA_THUC_HIEN' ? `Hoàn thành${k.ket_qua ? ' — ' + k.ket_qua : ''}`
         : k.trang_thai === 'DA_HUY' ? 'Đã hủy' : 'Đang chờ',
    })),
    ...(d.phan_hoi || []).map((p) => ({
      t: p.ngay + 'T12:00:00+07:00', icon: 'file',
      tieu: `Báo cáo ${fmtNgay(p.ngay)}`,
      phu: `${{ HOAN_THANH: 'Hoàn thành', DANG_LAM: 'Đang làm', CHUA_LAM: 'Chưa làm', HUY: 'Hủy' }[p.trang_thai]}${p.phan_hoi ? ' — ' + p.phan_hoi : ''}`,
    })),
    ...(d.cap_nhat || []).map((c) => ({
      t: c.tao_luc, icon: 'edit',
      tieu: c.noi_dung, phu: `${c.ho_ten}`,
    })),
  ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 30);

  sh.innerHTML = `<div class="sheet-grip"></div>
    <h3>${ic('briefcase')} ${esc(cv.tieu_de)}</h3>
    <div class="row" style="flex-wrap:wrap;gap:8px">
      ${routine
        ? `<span class="badge badge-acc">${ic('undo')} Thường xuyên</span>`
        : `<span class="badge ${conLai < 0 ? 'badge-danger' : conLai <= 1 ? 'badge-warn' : 'badge-gold'}">
             ${ic('clock')} ${conLai < 0 ? `Quá hạn ${-conLai} ngày` : conLai === 0 ? 'Đến hạn hôm nay' : `Còn ${conLai} ngày`}</span>`}
      <span class="badge badge-acc">${TEN_TT[cv.trang_thai]}</span>
      <span class="badge badge-gold">${ic('user')} ${esc(cv.ten_nhan || cv.giao_cho)}</span>
    </div>
    ${cv.mo_ta ? `<p class="muted mt" style="font-size:15px">${esc(cv.mo_ta)}</p>` : ''}

    ${!routine ? `
      <div class="pv-block">
        <div class="row" style="justify-content:space-between">
          <b style="font-family:var(--font-display);font-size:22px">${cv.tien_do || 0}%</b>
          <span class="mono muted" style="font-size:12px">${tk.kh_xong || 0}/${tk.kh_tong || 0} kế hoạch đã xong</span>
        </div>
        <div style="margin-top:8px;height:10px;border-radius:99px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden">
          <div style="height:100%;width:${cv.tien_do || 0}%;background:var(--acc-grad)"></div>
        </div>
      </div>
      ${(d.moc || []).length ? `
        <div class="pv-block">
          <span class="pv-kind">${ic('flag')} Lộ trình mốc</span>
          <ul class="tl" style="margin-top:12px">
            ${d.moc.map((m) => {
              const tre = m.trang_thai === 'CHO' && new Date(m.han) < new Date();
              return `<li>
                <span class="tl-time">${fmtNgayGio(m.han)}${tre ? ' · <b style="color:var(--danger)">TRỄ</b>' : ''}</span>
                <div class="tl-place" ${m.trang_thai === 'XONG' ? 'style="opacity:.6;text-decoration:line-through"' : ''}>${esc(m.ten_moc)}</div>
                ${m.trang_thai === 'CHO'
                  ? `<button class="btn btn-sm btn-quiet mt" data-moc="${m.id}" style="min-height:38px">${ic('check')} Xong mốc này</button>`
                  : `<div class="tl-note">${ic('check')} Hoàn thành ${fmtNgayGio(m.hoan_thanh_luc)}</div>`}
              </li>`;
            }).join('')}
          </ul>
        </div>` : ''}`
    : `
      <div class="pv-block">
        <span class="pv-kind">${ic('chart')} Kỷ luật 30 ngày</span>
        <div class="row mt" style="gap:14px">
          <div><b style="font-family:var(--font-display);font-size:24px">${tk.sinh_30n ? Math.round(100 * (tk.xong_30n || 0) / tk.sinh_30n) : 0}%</b>
            <div class="muted" style="font-size:12px">tuân thủ</div></div>
          <div class="muted" style="font-size:14px">${tk.xong_30n || 0}/${tk.sinh_30n || 0} lần thực hiện đúng.<br>Hệ thống tự sinh nhắc mỗi kỳ.</div>
        </div>
      </div>`}

    <div class="pv-block">
      <span class="pv-kind">${ic('edit')} Cập nhật tiến độ</span>
      ${!routine ? `
        <div class="row mt">
          <input type="range" min="0" max="100" step="5" value="${cv.tien_do || 0}" id="cvSlider" style="flex:1;accent-color:var(--acc)">
          <b class="mono" id="cvSliderVal" style="min-width:48px;text-align:right">${cv.tien_do || 0}%</b>
        </div>` : ''}
      <input class="input mt" id="cvGhiChu" placeholder="Tình hình mới nhất… (hoặc bấm mic nói với trợ lý)">
      <div class="row mt">
        <button class="btn btn-quiet" id="cvMic">${ic('mic')} Nói</button>
        <button class="btn btn-primary" id="cvLuu">${ic('check')} Lưu cập nhật</button>
      </div>
      ${cv.trang_thai !== 'VUONG_MAC'
        ? `<button class="btn btn-quiet mt" id="cvVuong">${ic('alert')} Báo vướng mắc</button>` : ''}
      ${!routine && cv.trang_thai !== 'HOAN_THANH'
        ? `<button class="btn btn-quiet mt" id="cvXong">${ic('check')} Hoàn thành công việc</button>` : ''}
    </div>

    ${dong.length ? `
      <div class="pv-block">
        <span class="pv-kind">${ic('clock')} Dòng hoạt động (${dong.length})</span>
        ${dong.map((x) => `
          <div class="list-item">
            ${ic(x.icon)}
            <div class="list-main">
              <div class="list-title" style="font-size:14px">${esc(x.tieu)}</div>
              <div class="list-sub" style="font-size:13px">${esc(x.phu)} · ${fmtNgayGio(x.t)}</div>
            </div>
          </div>`).join('')}
      </div>` : ''}`;

  // Handlers
  const dong360 = async () => { closeSheet(); reload(); };
  $$('[data-moc]', sh).forEach((b) => b.onclick = () => busy(b, async () => {
    try { await rpc('fn_cap_nhat_moc', { p_moc_id: Number(b.dataset.moc), p_trang_thai: 'XONG' });
      rung(16); toast('Em đã đánh dấu mốc hoàn thành ạ.'); mo360(id, reload);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
  const slider = $('#cvSlider', sh);
  if (slider) slider.oninput = () => $('#cvSliderVal', sh).textContent = slider.value + '%';
  $('#cvMic', sh).onclick = () => { closeSheet(); moGhiAm('troly', { onSaved: reload }); };
  $('#cvLuu', sh).onclick = () => busy($('#cvLuu', sh), async () => {
    const gc = $('#cvGhiChu', sh).value.trim();
    const td = slider ? Number(slider.value) : null;
    if (!gc && (td === null || td === (cv.tien_do || 0))) { toast('Anh/chị cho em xin nội dung cập nhật ạ.', 'err'); return; }
    try {
      await rpc('fn_cap_nhat_cong_viec', { p_id: id, p_thay_doi: {
        ...(td !== null && td !== (cv.tien_do || 0) ? { tien_do: td } : {}),
        ...(gc ? { ghi_chu: gc } : {}),
        ...(cv.trang_thai === 'CHUA_LAM' ? { trang_thai: 'DANG_LAM' } : {}),
      }});
      toast('Em đã ghi nhận cập nhật ạ.'); mo360(id, reload);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
  $('#cvVuong', sh) && ($('#cvVuong', sh).onclick = () => busy($('#cvVuong', sh), async () => {
    const gc = $('#cvGhiChu', sh).value.trim() || 'Báo vướng mắc, cần hỗ trợ.';
    try { await rpc('fn_cap_nhat_cong_viec', { p_id: id, p_thay_doi: { trang_thai: 'VUONG_MAC', ghi_chu: gc } });
      toast('Em đã báo vướng mắc lên hệ thống ạ.'); dong360();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
  $('#cvXong', sh) && ($('#cvXong', sh).onclick = () => busy($('#cvXong', sh), async () => {
    try { await rpc('fn_cap_nhat_cong_viec', { p_id: id, p_thay_doi: { trang_thai: 'HOAN_THANH', tien_do: 100 } });
      rung(20); toast('Chúc mừng anh/chị hoàn thành công việc ạ.'); dong360();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  }));
}

// ============ GIAO VIỆC (ADMIN / TRƯỞNG BP) ============
async function formGiaoViec(reload) {
  let nguoi = [], pb = [];
  try {
    [nguoi, pb] = await Promise.all([
      rpc('fn_admin_ds_nguoi_dung').catch(() => []),
      rpc('fn_admin_ds_phong_ban'),
    ]);
  } catch {}
  const nhanOpts = [
    ...pb.map((p) => `<option value="${p.ma_pb}">Phòng: ${esc(p.ten_pb)}</option>`),
    ...(nguoi || []).map((n) => `<option value="${n.ma_nv}">${esc(n.ho_ten)} (${n.ma_nv})</option>`),
  ].join('');

  const p = (n) => String(n).padStart(2, '0');
  const d7 = new Date(Date.now() + 7 * 864e5);
  const hanMac = `${d7.getFullYear()}-${p(d7.getMonth() + 1)}-${p(d7.getDate())}T17:00`;

  const sh = openSheet(`
    <h3>${ic('plus')} Giao việc mới</h3>
    <div class="field"><label>Việc gì</label>
      <input class="input" id="gvTd" placeholder="Vd: Triển khai hệ thống kho mới"></div>
    <div class="field"><label>Giao cho</label>
      <select class="input" id="gvGiao">${nhanOpts}</select></div>
    <div class="field"><label>Dạng công việc</label>
      <div class="row">
        <button class="btn btn-primary" id="gvDangTH" data-dang="THOI_HAN" style="flex:1">${ic('clock')} Có thời hạn</button>
        <button class="btn btn-quiet" id="gvDangTX" data-dang="THUONG_XUYEN" style="flex:1">${ic('undo')} Thường xuyên</button>
      </div></div>

    <div id="gvKhoiTH">
      <div class="field"><label>Hạn hoàn thành</label>
        <input class="input" type="datetime-local" id="gvHan" value="${hanMac}"></div>
      <div class="field"><label>Các mốc lộ trình (tùy chọn)</label>
        <div id="gvMocList"></div>
        <button class="btn btn-sm btn-quiet" id="gvThemMoc">${ic('plus')} Thêm mốc</button></div>
    </div>
    <div id="gvKhoiTX" class="hidden">
      <div class="field"><label>Lặp vào các thứ</label>
        <div class="row" style="flex-wrap:wrap" id="gvThu">
          ${['T2','T3','T4','T5','T6','T7','CN'].map((t, i) =>
            `<button class="btn btn-sm btn-quiet gv-thu" data-thu="${i + 1}" style="flex:0 0 auto;min-width:52px">${t}</button>`).join('')}
        </div></div>
      <div class="field"><label>Giờ thực hiện</label>
        <input class="input" type="time" id="gvGio" value="08:00"></div>
    </div>

    <div class="row">
      <div class="field" style="flex:1"><label>Mức ưu tiên</label>
        <select class="input" id="gvUt">
          <option value="BINH_THUONG">Bình thường</option><option value="CAO">Cao</option>
          <option value="KHAN">Khẩn</option><option value="THAP">Thấp</option>
        </select></div>
    </div>
    <div class="field"><label>Mô tả</label><textarea class="input" id="gvMoTa" style="min-height:80px"></textarea></div>
    <button class="btn btn-primary" id="gvOK">${ic('check')} Giao việc</button>`);

  let dang = 'THOI_HAN';
  const doiDang = (m) => {
    dang = m;
    $('#gvDangTH', sh).className = `btn ${m === 'THOI_HAN' ? 'btn-primary' : 'btn-quiet'}`;
    $('#gvDangTX', sh).className = `btn ${m === 'THUONG_XUYEN' ? 'btn-primary' : 'btn-quiet'}`;
    $('#gvKhoiTH', sh).classList.toggle('hidden', m !== 'THOI_HAN');
    $('#gvKhoiTX', sh).classList.toggle('hidden', m !== 'THUONG_XUYEN');
  };
  $('#gvDangTH', sh).onclick = () => doiDang('THOI_HAN');
  $('#gvDangTX', sh).onclick = () => doiDang('THUONG_XUYEN');
  $$('.gv-thu', sh).forEach((b) => b.onclick = () =>
    b.className = b.className.includes('btn-primary') ? 'btn btn-sm btn-quiet gv-thu' : 'btn btn-sm btn-primary gv-thu');
  $('#gvThemMoc', sh).onclick = () => {
    const div = document.createElement('div');
    div.className = 'row'; div.style.marginBottom = '8px';
    div.innerHTML = `
      <input class="input gv-moc-ten" placeholder="Tên mốc" style="flex:1.4">
      <input class="input gv-moc-han" type="datetime-local" style="flex:1">
      <button class="btn btn-sm btn-quiet" style="flex:0 0 auto">${ic('x')}</button>`;
    div.querySelector('button').onclick = () => div.remove();
    $('#gvMocList', sh).appendChild(div);
  };

  $('#gvOK', sh).onclick = () => busy($('#gvOK', sh), async () => {
    const td = $('#gvTd', sh).value.trim();
    if (!td) { toast('Anh/chị cho em xin tên công việc ạ.', 'err'); return; }
    let han = null, chuKy = null, moc = [];
    if (dang === 'THOI_HAN') {
      if (!$('#gvHan', sh).value) { toast('Việc có thời hạn cần hạn hoàn thành ạ.', 'err'); return; }
      han = new Date($('#gvHan', sh).value).toISOString();
      moc = $$('#gvMocList .row', sh).map((r) => ({
        ten: $('.gv-moc-ten', r).value.trim(),
        han: $('.gv-moc-han', r).value ? new Date($('.gv-moc-han', r).value).toISOString() : null,
      })).filter((m) => m.ten && m.han);
    } else {
      const thu = $$('.gv-thu.btn-primary', sh).map((b) => Number(b.dataset.thu));
      if (!thu.length) { toast('Anh/chị chọn ít nhất một thứ trong tuần ạ.', 'err'); return; }
      chuKy = { thu, gio: $('#gvGio', sh).value || '08:00' };
    }
    try {
      await rpc('fn_tao_cong_viec', {
        p_tieu_de: td, p_giao_cho: $('#gvGiao', sh).value, p_dang: dang,
        p_mo_ta: $('#gvMoTa', sh).value.trim() || null,
        p_uu_tien: $('#gvUt', sh).value, p_han: han, p_chu_ky: chuKy, p_moc: moc,
      });
      closeSheet(); rung(18);
      toast('Em đã giao việc và báo cho người nhận ạ.'); reload();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}
