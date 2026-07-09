// ============================================================
// CÔNG VIỆC — 11-tab-baocao.js
// ============================================================
import { rpc, phien, nenAnh, uploadAnh, anhURL, loiNguoi } from './01-supabase.js';
import { $, $$, ic, esc, nl2html, mdMini, toast, openSheet, busy, fmtNgay, fmtGio, fmtNgayGio, homNayVN } from './03-ui.js';
import { MC } from './00-config.js';
import { moGhiAm, xuLyVoiTroLy } from './05-troly.js';

let photos = []; // { blob, url }
let khChoCount = 0;
let khChoDs = [];

export async function renderBaoCao(root) {
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Báo cáo</h1>
        <p class="page-sub">Nói vài câu, em soạn báo cáo chỉn chu giúp mình ạ.</p></div>
    </div>

    <div class="card" id="bcBoSung" style="display:none">
      <h2 class="card-title">${ic('edit')} Bổ sung báo cáo hôm nay</h2>
      <p class="muted" style="font-size:14px;margin:0 0 10px">Báo cáo đã gửi không sửa nội dung gốc — bổ sung sẽ được ghi kèm dấu thời gian, minh bạch cho Ban Quản trị ạ.</p>
      <textarea class="input" id="bcBSText" placeholder="Ý bổ sung… (cũng có thể nhờ trợ lý bằng mic)" style="min-height:100px"></textarea>
      <div class="row mt">
        <button class="btn btn-quiet" id="bcBSMic">${ic('mic')} Nhờ trợ lý</button>
        <button class="btn btn-primary" id="bcBSGui">${ic('check')} Gửi bổ sung</button>
      </div>
    </div>
    <div class="card" id="bcKeHoach" style="display:none">
      <h2 class="card-title">${ic('calendar')} Kế hoạch chờ phản hồi hôm nay</h2>
      <p class="muted" style="font-size:14px;margin:0 0 6px">Báo cáo cuối ngày cần phản hồi từng mục dưới đây — anh/chị cứ nói tự nhiên, em sẽ tự đối chiếu ạ.</p>
      <div id="bcKhList"></div>
    </div>

    <div class="card">
      <h2 class="card-title">${ic('file')} Báo cáo hôm nay</h2>
      <textarea class="input" id="bcText"
        placeholder="Anh/chị bấm mic để nói, hoặc gõ tự do tại đây…"></textarea>
      <div class="photo-grid" id="bcPhotos"></div>
      <div class="row mt">
        <button class="btn btn-quiet" id="bcMic">${ic('mic')} Nói</button>
        <button class="btn btn-quiet" id="bcCam">${ic('camera')} Ảnh</button>
      </div>
      <button class="btn btn-primary mt" id="bcAI">${ic('sparkle')} Nhờ trợ lý chuẩn hóa &amp; gửi</button>
      <button class="btn btn-quiet mt" id="bcRaw">${ic('send')} Gửi nguyên văn</button>
      <input type="file" id="bcFile" accept="image/*" multiple hidden>
    </div>

    <div class="card mb0">
      <h2 class="card-title">${ic('clock')} 7 ngày gần đây</h2>
      <div id="bcHist"><div class="skeleton" style="height:70px"></div></div>
    </div>`;

  vePhotos(root);
  veKeHoachCho(root);
  veBoSung(root, D);

  const reload = () => { photos = []; renderBaoCao(root); };
  const getAnh = async () => {
    const out = [];
    for (let i = 0; i < photos.length; i++) {
      out.push({ path: await uploadAnh(photos[i].blob), thu_tu: i });
    }
    return out;
  };

  $('#bcMic', root).onclick = () => {
    const ctxHtml = khChoDs.length ? `
      <div class="rec-ctx-title">${ic('calendar')} Kế hoạch cần phản hồi (${khChoDs.length})</div>
      ${khChoDs.map((k, idx) => `<div class="rec-ctx-item">
        <b>${idx + 1}.</b> <span>${esc(k.tieu_de)}</span>
        <span class="mono">${fmtGio(k.thoi_gian)}</span>
      </div>`).join('')}` : '';
    moGhiAm('baocao', { startText: $('#bcText', root).value, getAnh, onSaved: reload, contextHtml: ctxHtml });
  };

  $('#bcCam', root).onclick = () => $('#bcFile', root).click();
  $('#bcFile', root).onchange = async (e) => {
    for (const f of [...e.target.files].slice(0, 10 - photos.length)) {
      try {
        const blob = await nenAnh(f);
        photos.push({ blob, url: URL.createObjectURL(blob) });
      } catch { toast('Không đọc được một ảnh ạ.', 'err'); }
    }
    e.target.value = '';
    vePhotos(root);
  };

  $('#bcAI', root).onclick = () => {
    const t = $('#bcText', root).value.trim();
    if (!t) { toast('Anh/chị nói hoặc gõ nội dung trước ạ.', 'err'); return; }
    xuLyVoiTroLy(t, 'baocao', { goc: t, getAnh, onSaved: reload });
  };

  $('#bcRaw', root).onclick = () => busy($('#bcRaw', root), async () => {
    const t = $('#bcText', root).value.trim();
    if (!t) { toast('Nội dung báo cáo đang trống ạ.', 'err'); return; }
    if (khChoCount > 0) {
      toast(`Còn ${khChoCount} kế hoạch chờ phản hồi ạ. Anh/chị dùng nút "Nhờ trợ lý" để em đối chiếu từng mục nhé.`, 'err', 5200);
      return;
    }
    try {
      const anh = await getAnh();
      await rpc('fn_gui_bao_cao', {
        p_noi_dung: t, p_noi_dung_goc: null, p_co_van_de: false,
        p_audio_path: null, p_anh: anh,
      });
      toast(MC.daLuuBaoCao); reload();
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });

  veLichSu(root);
}

async function veKeHoachCho(root) {
  khChoCount = 0;
  try {
    const ds = await rpc('fn_ke_hoach_cho_phan_hoi');
    if (!ds?.length) return;
    khChoCount = ds.length;
    khChoDs = ds;
    const card = $('#bcKeHoach', root);
    card.style.display = '';
    $('#bcKhList', root).innerHTML = ds.map((k) => `
      <div class="list-item">
        <span class="badge badge-gold mono">${fmtNgayGio(k.thoi_gian)}</span>
        <div class="list-main">
          <div class="list-title">${esc(k.tieu_de)}</div>
          ${k.dia_diem ? `<div class="list-sub">${esc(k.dia_diem)}</div>` : ''}
        </div>
      </div>`).join('');
  } catch {}
}

function vePhotos(root) {
  const g = $('#bcPhotos', root);
  g.innerHTML = photos.map((p, i) => `
    <div class="ph"><img src="${p.url}" alt="">
      <button class="ph-del" data-i="${i}" aria-label="Xóa ảnh">${ic('x', 'ic')}</button></div>`).join('')
    + (photos.length < 10 ? `<button class="photo-add" id="phAdd">${ic('plus')}</button>` : '');
  $$('.ph-del', g).forEach((b) => b.onclick = () => {
    URL.revokeObjectURL(photos[b.dataset.i].url);
    photos.splice(b.dataset.i, 1); vePhotos(root);
  });
  $('#phAdd', g) && ($('#phAdd', g).onclick = () => $('#bcFile', root).click());
}

async function veLichSu(root) {
  const box = $('#bcHist', root);
  const den = homNayVN();
  const tu = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  let ds;
  try {
    ds = await rpc('fn_ds_bao_cao', {
      p_tu: tu, p_den: den, p_ma_nv: phien.nd().ma_nv, p_chi_van_de: false,
    });
  } catch (e) { box.innerHTML = `<p class="muted mb0">${esc(loiNguoi(e))}</p>`; return; }

  if (!ds?.length) { box.innerHTML = '<p class="muted mb0">Chưa có báo cáo nào trong tuần ạ.</p>'; return; }
  box.innerHTML = ds.map((b) => `
    <div class="list-item" data-id="${b.id}" style="cursor:pointer">
      <div class="list-main">
        <div class="list-title">${fmtNgay(b.ngay)}
          ${b.co_van_de ? `<span class="badge badge-danger">${ic('alert')} Vấn đề</span>` : ''}</div>
        <div class="list-sub">${esc(b.noi_dung.replace(/\*\*/g, '').slice(0, 84))}…</div>
      </div>
      ${b.anh?.length ? `<span class="badge badge-gold">${ic('camera')} ${b.anh.length}</span>` : ''}
    </div>`).join('');

  $$('.list-item', box).forEach((el) => el.onclick = () => {
    const b = ds.find((x) => String(x.id) === el.dataset.id);
    openSheet(`
      <h3>${ic('file')} Báo cáo ${fmtNgay(b.ngay)} · ${fmtGio(b.gui_luc)}</h3>
      ${b.co_van_de ? `<span class="badge badge-danger">${ic('alert')} Có vấn đề phát sinh</span>` : ''}
      <div class="pv-block"><div class="md-doc">${mdMini(b.noi_dung)}</div></div>
      ${b.anh?.length ? `<div class="photo-grid">${b.anh.map((a) =>
        `<div class="ph"><img src="${anhURL(a.storage_path)}" loading="lazy" alt=""></div>`).join('')}</div>` : ''}
      ${b.audio_path ? `<audio class="mt" controls style="width:100%" src="${anhURL(b.audio_path)}"></audio>` : ''}
      ${b.noi_dung_goc ? `<details class="mt"><summary class="muted">Bản nói gốc</summary>
        <p class="muted" style="font-size:14px">${esc(b.noi_dung_goc)}</p></details>` : ''}`);
  });
}

function veBoSung(root, D) {
  const bc = D?.bao_cao;
  if (!bc?.id) return;
  const card = $('#bcBoSung', root);
  card.style.display = '';
  $('#bcBSMic', root).onclick = () =>
    import('./05-troly.js').then(({ moGhiAm }) =>
      moGhiAm('troly', { onSaved: () => renderBaoCao(root) }));
  $('#bcBSGui', root).onclick = () => busy($('#bcBSGui', root), async () => {
    const t = $('#bcBSText', root).value.trim();
    if (!t) { toast('Anh/chị cho em xin nội dung bổ sung ạ.', 'err'); return; }
    try {
      await rpc('fn_bo_sung_bao_cao', { p_id: bc.id, p_noi_dung_them: t });
      toast('Em đã bổ sung vào báo cáo hôm nay ạ.'); renderBaoCao(root);
    } catch (e) { toast(loiNguoi(e), 'err'); }
  });
}
