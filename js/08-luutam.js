// ============================================================
// CÔNG VIỆC — 08-luutam.js
// An toàn dữ liệu giọng nói: mọi đoạn người dùng vừa nói được
// GIỮ LẠI trong localStorage NGAY trước khi gọi AI. Chỉ xóa khi
// AI xử lý xong và dữ liệu đã lưu vào hệ thống. Nếu AI lỗi /
// mất mạng / thoát app giữa chừng → còn nguyên để khôi phục.
//
// Đây KHÔNG phải "lưu nháp" chủ động — hoàn toàn tự động, người
// dùng không cần bấm gì.
// ============================================================

const KEY = 'cv_giongnoi_choxuly';
const HET_HAN_MS = 24 * 60 * 60 * 1000; // giữ tối đa 24h

// ---------- Ghi lại đoạn vừa nói (gọi NGAY khi có text, trước AI) ----------
export function luuTam(text, mode = 'troly', meta = {}) {
  if (!text?.trim()) return null;
  const ban = {
    id: Date.now(),
    text: text.trim(),
    mode,
    meta,               // vd { man: 'baocao' }
    luc: new Date().toISOString(),
    trang_thai: 'dang_xu_ly',
  };
  try { localStorage.setItem(KEY, JSON.stringify(ban)); } catch {}
  return ban.id;
}

// ---------- Xử lý xong → xóa (chỉ xóa đúng bản đó) ----------
export function xoaTam(id) {
  try {
    const b = layTam();
    if (!b || (id && b.id !== id)) return;
    localStorage.removeItem(KEY);
  } catch {}
}

// ---------- Đọc bản đang chờ (nếu có, còn hạn) ----------
export function layTam() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b?.text) return null;
    if (Date.now() - new Date(b.luc).getTime() > HET_HAN_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return b;
  } catch { return null; }
}

// ---------- Đánh dấu bản đang chờ là "AI lỗi" (giữ lại để khôi phục) ----------
export function danhDauLoi(id) {
  try {
    const b = layTam();
    if (!b || (id && b.id !== id)) return;
    b.trang_thai = 'loi';
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
}
