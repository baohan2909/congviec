// ============================================================
// CÔNG VIỆC — 99-app.js  (khởi động)
// ============================================================
import { phien } from './01-supabase.js';
import { renderLogin } from './02-auth.js';
import { $, $$, ic, rung } from './03-ui.js';
import { renderHomNay } from './10-tab-homnay.js';
import { renderBaoCao } from './11-tab-baocao.js';
import { renderKeHoach } from './12-tab-kehoach.js';
import { renderTaiKhoan } from './13-tab-taikhoan.js';
import { renderCongViec } from './15-tab-congviec.js';
import { renderQuanTri } from './14-tab-quantri.js';
import { kiemTraGiongNoiChoXuLy } from './05-troly.js';

// ---------- Theme (sáng mặc định) ----------
const theme = localStorage.getItem('cv_theme') || 'light'; // mặc định SÁNG
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name=theme-color]')
  ?.setAttribute('content', theme === 'dark' ? '#050B1F' : '#EEF3FA');

// ---------- Phản hồi bấm: rung nhẹ tức thì cho mọi nút ----------
addEventListener('pointerdown', (e) => {
  const b = e.target.closest?.('.btn, .tabbar-item, .seg button, .seg-mini button, .tagc, .chip');
  if (b && !b.disabled) rung(9);
}, { passive: true });

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// ---------- Tabs ----------
const TABS = [
  { id: 'homnay',   icon: 'sun',      label: 'Hôm nay',   render: renderHomNay },
  { id: 'baocao',   icon: 'file',     label: 'Báo cáo',   render: renderBaoCao },
  { id: 'kehoach',  icon: 'calendar', label: 'Kế hoạch',  render: renderKeHoach },
  { id: 'congviec', icon: 'briefcase', label: 'Việc',     render: renderCongViec },
  { id: 'taikhoan', icon: 'user',     label: 'Tài khoản', render: renderTaiKhoan },
];
let current = 'homnay';

function startApp() {
  $('#screen-login').classList.remove('active');
  $('#screen-app').classList.add('active');

  const tabs = [...TABS];
  if (phien.nd()?.vai_tro === 'ADMIN') {
    tabs.splice(4, 0, { id: 'quantri', icon: 'shield', label: 'Quản trị', render: renderQuanTri });
  }

  $('#tabbar').innerHTML = tabs.map((t) => `
    <button class="tab ${t.id === current ? 'active' : ''}" data-id="${t.id}" aria-label="${t.label}">
      ${ic(t.icon)}<span>${t.label}</span><span class="dot"></span>
    </button>`).join('');

  // Mỗi tab một container riêng, giữ trong DOM → chuyển tab là hiện lại tức thì (không fetch lại).
  const cont = {};       // id -> div container
  const lanRender = {};  // id -> timestamp render gần nhất
  const HET_HAN = 30000; // >30s coi là cũ, tải lại nền

  const goTab = (id, epMoi = false) => {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    current = id;
    window.cvTabHienTai = id;
    rung(8);
    $$('#tabbar .tab').forEach((b) => b.classList.toggle('active', b.dataset.id === id));

    // tạo container nếu chưa có
    if (!cont[id]) {
      cont[id] = document.createElement('div');
      $('#tabContent').appendChild(cont[id]);
    }
    // ẩn tất cả, hiện tab hiện tại
    Object.entries(cont).forEach(([k, el]) => { el.style.display = k === id ? '' : 'none'; });

    const chuaRender = !lanRender[id];
    const quaCu = lanRender[id] && (Date.now() - lanRender[id] > HET_HAN);
    if (chuaRender || quaCu || epMoi) {
      const paint = () => { t.render(cont[id]); lanRender[id] = Date.now(); };
      if (chuaRender && document.startViewTransition) document.startViewTransition(paint);
      else paint();  // đã có DOM cũ → hiện ngay, render đè khi có dữ liệu mới
    }
  };
  // Ép render lại một tab (dùng sau khi có thao tác thay đổi dữ liệu)
  window.cvLamMoiTab = (id) => { if (lanRender[id]) { lanRender[id] = 0; if (id === current) goTab(id, true); } };
  window.cvGoTab = (id) => goTab(id);

  $$('#tabbar .tab').forEach((b) => b.onclick = () => goTab(b.dataset.id));
  goTab('homnay');

  // An toàn giọng nói: còn đoạn nào chưa xử lý xong thì mời khôi phục
  setTimeout(() => kiemTraGiongNoiChoXuLy(), 900);
}

// ---------- Vào app ----------
if (phien.token()) startApp();
else { $('#screen-login').classList.add('active'); renderLogin(startApp); }
