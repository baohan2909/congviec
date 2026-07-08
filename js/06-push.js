// ============================================================
// CÔNG VIỆC — 06-push.js  (Web Push)
// iOS: cần cài app lên màn hình chính (iOS 16.4+) mới bật được.
// ============================================================
import { SYS, MC } from './00-config.js';
import { rpc } from './01-supabase.js';
import { toast } from './03-ui.js';

const b64ToU8 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushHoTro = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function trangThaiPush() {
  if (!pushHoTro()) return 'KHONG_HO_TRO';
  if (Notification.permission === 'denied') return 'BI_CHAN';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'DANG_BAT' : 'CHUA_BAT';
  } catch { return 'CHUA_BAT'; }
}

export async function batPush() {
  if (!pushHoTro()) { toast('Thiết bị chưa hỗ trợ thông báo đẩy ạ.', 'err'); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast(MC.pushTuChoi, 'err', 4600); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToU8(SYS.VAPID_PUBLIC),
    });
    await rpc('fn_luu_push', { p_sub: sub.toJSON() });
    toast(MC.pushDaBat);
    return true;
  } catch (e) {
    console.error(e);
    toast('Chưa bật được thông báo ạ. Anh/chị thử lại giúp em nhé.', 'err');
    return false;
  }
}

export async function tatPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {}
  await rpc('fn_tat_push').catch(() => {});
  toast('Em đã tắt thông báo đẩy ạ.');
}
