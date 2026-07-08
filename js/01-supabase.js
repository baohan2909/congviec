// ============================================================
// CÔNG VIỆC — 01-supabase.js
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SYS, loiNguoi } from './00-config.js';

export const sb = createClient(SYS.SUPA_URL, SYS.SUPA_ANON);

// ---------- Phiên ----------
const KEY = 'cv_phien';
export const phien = {
  get: () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set: (p) => localStorage.setItem(KEY, JSON.stringify(p)),
  clear: () => localStorage.removeItem(KEY),
  token: () => phien.get()?.token || null,
  nd: () => phien.get()?.nguoi_dung || null,
};

// ---------- Gọi RPC có token ----------
export async function rpc(fn, args = {}, canToken = true) {
  const payload = canToken ? { p_token: phien.token(), ...args } : args;
  const { data, error } = await sb.rpc(fn, payload);
  if (error) {
    if (String(error.message).includes('PHIEN_HET_HAN')) {
      phien.clear();
      location.reload();
    }
    throw new Error(error.message);
  }
  return data;
}

// ---------- Nén ảnh về WebP ≤1600px ----------
export function nenAnh(file, maxSide = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('NEN_ANH_LOI'))),
        'image/webp', quality,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('DOC_ANH_LOI'));
    img.src = URL.createObjectURL(file);
  });
}

// ---------- Upload lên Storage ----------
export async function uploadAnh(blob, ext = 'webp') {
  const nd = phien.nd();
  const d = new Date().toISOString().slice(0, 10);
  const path = `${nd.ma_nv}/${d}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(SYS.BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
export const anhURL = (path) =>
  sb.storage.from(SYS.BUCKET).getPublicUrl(path).data.publicUrl;

export { loiNguoi };
