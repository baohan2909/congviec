// ============================================================
// CÔNG VIỆC — 03-ui.js  (icon SVG stroke · toast · sheet · utils)
// ============================================================

const PATHS = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/>',
  file: '<path d="M14 2.8H7a2 2 0 0 0-2 2v14.4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.8z"/><path d="M14 2.8v5h5M9 13h6M9 16.5h6"/>',
  calendar: '<rect x="3.5" y="4.8" width="17" height="16" rx="2.5"/><path d="M8 2.6v4.2M16 2.6v4.2M3.5 10h17"/>',
  user: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.6 20.4c1.2-3.6 4-5.4 7.4-5.4s6.2 1.8 7.4 5.4"/>',
  shield: '<path d="M12 2.8 4.8 5.6v6c0 4.6 3 8 7.2 9.6 4.2-1.6 7.2-5 7.2-9.6v-6z"/><path d="m8.8 12 2.3 2.3 4.1-4.4"/>',
  mic: '<rect x="9" y="2.8" width="6" height="11" rx="3"/><path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0M12 18v3.2M8.6 21.2h6.8"/>',
  camera: '<path d="M4 8.2h3l1.7-2.6h6.6L17 8.2h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20.2H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8.2z"/><circle cx="12" cy="13.7" r="3.6"/>',
  send: '<path d="M21 3.5 10.4 14.1M21 3.5l-6.8 17-3.8-6.9L3.5 9.8z"/>',
  pause: '<rect x="6.5" y="4.5" width="3.6" height="15" rx="1.3"/><rect x="13.9" y="4.5" width="3.6" height="15" rx="1.3"/>',
  check: '<path d="m4.5 12.6 4.8 4.8L19.5 6.6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M12 21.4s7-6 7-11.2A7 7 0 0 0 5 10.2c0 5.2 7 11.2 7 11.2z"/><circle cx="12" cy="10" r="2.6"/>',
  building: '<rect x="4.5" y="3.5" width="15" height="17.5" rx="1.5"/><path d="M9 21V16.8h6V21M8.5 7.5h2M13.5 7.5h2M8.5 11.5h2M13.5 11.5h2"/>',
  home: '<path d="m3.8 11 8.2-7.4L20.2 11"/><path d="M5.6 9.6V20a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9.6"/><path d="M10 21v-5.6h4V21"/>',
  car: '<path d="M4 16.4 5.5 10a2 2 0 0 1 2-1.5h9a2 2 0 0 1 2 1.5L20 16.4"/><path d="M3.4 16.4h17.2v3a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-1H6.8v1a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1z"/><path d="M7 13.4h.01M17 13.4h.01"/>',
  leaf: '<path d="M5.5 18.5C4 12 8 5.5 19 4.5c.5 11-5 15.5-11.5 14z"/><path d="M5.5 18.5C8.5 14 12 11 16 8.5"/>',
  bell: '<path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 5.6-2 7h16c0-1.4-2-2-2-7z"/><path d="M10 19.8a2.1 2.1 0 0 0 4 0"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 9.8v4.4M12 17.1h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  sparkle: '<path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18.1l-1.8-5.5L4.7 10.8 10.2 9z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>',
  out: '<path d="M9.5 21H5.6a1.6 1.6 0 0 1-1.6-1.6V4.6A1.6 1.6 0 0 1 5.6 3h3.9M15.5 16.5 20 12l-4.5-4.5M20 12H9.5"/>',
  edit: '<path d="M4 20h4.2L20 8.2a2.1 2.1 0 0 0-3-3L5.2 17z"/><path d="m14.5 6.7 3 3"/>',
  key: '<circle cx="8" cy="15.5" r="4.5"/><path d="m11.2 12.3 8.3-8.3M17 6.5l3 3M14.5 9l2.3 2.3"/>',
  users: '<circle cx="9" cy="8.4" r="3.4"/><path d="M2.8 20c1-3.2 3.4-4.8 6.2-4.8s5.2 1.6 6.2 4.8"/><path d="M15.5 5.4a3.4 3.4 0 0 1 0 6M17.8 15.4c1.8.6 3 1.9 3.6 4"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.9"/>',
  briefcase: '<rect x="3" y="7.5" width="18" height="13" rx="2.2"/><path d="M8.5 7.5V5.6A1.6 1.6 0 0 1 10.1 4h3.8a1.6 1.6 0 0 1 1.6 1.6v1.9M3 12.5h18M12 11v3"/>',
  flag: '<path d="M5.5 21V4.2"/><path d="M5.5 4.8c4.5-2.4 8.5 2.2 13-.2v9c-4.5 2.4-8.5-2.2-13 .2"/>',
  scan: '<path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"/><circle cx="12" cy="10.6" r="2.6"/><path d="M7.6 16.6c1-2 2.5-3 4.4-3s3.4 1 4.4 3"/>',
  factory: '<path d="M3.5 20.5V10l5 3.2V10l5 3.2V4.5h7v16"/><path d="M2.5 20.5h19M16.5 8.5h1.6M16.5 12.5h1.6M16.5 16.5h1.6"/>',
  undo: '<path d="M4 10.5h10a5 5 0 0 1 0 10h-4"/><path d="m8 6.5-4 4 4 4"/>',
  chart: '<path d="M4 20.5V4M4 20.5h16.5"/><path d="M8.5 16.5V11M13 16.5V7.5M17.5 16.5v-5.8"/>',
};
export const ic = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.sparkle}</svg>`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const nl2html = (s) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

// Markdown mini cho tài liệu (kế hoạch/báo cáo): tiêu đề đậm, danh sách số, gạch đầu dòng
export function mdMini(src) {
  const lines = String(src ?? '').split('\n');
  let html = '', mode = ''; // '', 'ol', 'ul'
  const close = () => { if (mode) { html += mode === 'ol' ? '</ol>' : '</ul>'; mode = ''; } };
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    let m;
    if ((m = line.match(/^(\d+)[.)]\s+(.*)$/))) {
      if (mode !== 'ol') { close(); html += '<ol class="md-ol">'; mode = 'ol'; }
      html += `<li>${inline(m[2])}</li>`;
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      if (mode !== 'ul') { close(); html += '<ul class="md-ul">'; mode = 'ul'; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^#{1,3}\s+(.*)$/))) {
      close(); html += `<h4 class="md-h">${inline(m[1])}</h4>`;
    } else if (/^\*\*.+\*\*:?$/.test(line)) {
      close(); html += `<div class="md-sec">${inline(line.replace(/:$/, ''))}</div>`;
    } else {
      close(); html += `<p class="md-p">${inline(line)}</p>`;
    }
  }
  close();
  return html;
}
export const rung = (ms = 12) => { try { navigator.vibrate?.(ms); } catch {} };

// ---------- Ngày giờ VN ----------
export const homNayVN = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()); // YYYY-MM-DD
export const fmtNgay = (d) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
    .format(typeof d === 'string' ? new Date(d + 'T00:00:00+07:00') : d);
export const fmtGio = (iso) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));
export const fmtNgayGio = (iso) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

// Hôm nay → chỉ giờ; khác ngày → ngày + giờ
export const gioThongMinh = (iso) => {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));
  return d === homNayVN() ? fmtGio(iso) : fmtNgayGio(iso);
};

// ---------- Toast ----------
export function toast(msg, type = 'ok', ttl = 3200) {
  let wrap = $('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${ic(type === 'ok' ? 'check' : 'alert')}<span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ttl);
}

// ---------- Sheet ----------
export function openSheet(html) {
  closeSheet();
  const back = document.createElement('div'); back.className = 'sheet-back open'; back.id = 'sheetBack';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'sheetBox';
  sh.innerHTML = `<div class="sheet-grip"></div>${html}`;
  document.body.append(back, sh);
  requestAnimationFrame(() => sh.classList.add('open'));
  back.onclick = closeSheet;
  return sh;
}
export function closeSheet() {
  const sh = $('#sheetBox'), back = $('#sheetBack');
  if (sh) { sh.classList.remove('open'); setTimeout(() => sh.remove(), 260); }
  back?.remove();
}

// ---------- Busy button ----------
export async function busy(btn, fn) {
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try { return await fn(); }
  finally { btn.disabled = false; btn.innerHTML = old; }
}
