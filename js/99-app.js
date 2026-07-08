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

// ---------- Theme (sáng mặc định) ----------
const theme = localStorage.getItem('cv_theme')
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name=theme-color]')
  ?.setAttribute('content', theme === 'dark' ? '#050B1F' : '#EEF3FA');

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

  const goTab = (id) => {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    current = id;
    rung(8);
    $$('#tabbar .tab').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    const paint = () => t.render($('#tabContent'));
    if (document.startViewTransition) document.startViewTransition(paint);
    else paint();
  };
  window.cvGoTab = goTab;

  $$('#tabbar .tab').forEach((b) => b.onclick = () => goTab(b.dataset.id));
  goTab('homnay');
}

// ---------- Vào app ----------
if (phien.token()) startApp();
else { $('#screen-login').classList.add('active'); renderLogin(startApp); }
