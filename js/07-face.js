// ============================================================
// CÔNG VIỆC — 07-face.js  (Đăng nhập khuôn mặt)
// · Nhận diện chạy 100% trên thiết bị (face-api, model ~6MB,
//   tải 1 lần rồi SW cache). Ảnh mặt không rời khỏi máy —
//   chỉ vector 128 số được lưu.
// · So khớp 2 lớp: local trước (nhanh) → server xác nhận cấp phiên.
// · Lỗi tải model / camera → tự ẩn, không ảnh hưởng mật khẩu.
// ============================================================
import { MC } from './00-config.js';
import { rpc, phien } from './01-supabase.js';
import { $, ic, esc, toast } from './03-ui.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15';
const NGUONG = 0.5;
const KEY = 'cv_face'; // { ma_nv, emb: number[128] }

let faceapi = null;

export const faceLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const xoaFaceLocal = () => localStorage.removeItem(KEY);

async function napModel() {
  if (faceapi) return faceapi;
  const mod = await import(`${CDN}/dist/face-api.esm.js`);
  faceapi = mod;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(`${CDN}/model`),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(`${CDN}/model`),
    faceapi.nets.faceRecognitionNet.loadFromUri(`${CDN}/model`),
  ]);
  return faceapi;
}

function moCamera() {
  const ov = document.createElement('div');
  ov.className = 'rec-overlay open';
  ov.innerHTML = `
    <div class="face-ring"><video id="fvVideo" autoplay playsinline muted></video></div>
    <p class="rec-hint" id="fvHint">${MC.faceDangQuet}</p>
    <button class="btn btn-quiet" id="fvHuy" style="width:auto;min-width:180px">${ic('x')} Hủy</button>`;
  document.body.appendChild(ov);
  return ov;
}

async function quet(ov, timeoutMs = 9000) {
  const api = await napModel();
  const video = $('#fvVideo', ov);
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 } }, audio: false,
  });
  video.srcObject = stream;
  await new Promise((r) => (video.onloadedmetadata = r));

  const t0 = Date.now();
  try {
    while (Date.now() - t0 < timeoutMs) {
      if (!ov.isConnected) return null; // người dùng hủy
      const kq = await api
        .detectSingleFace(video, new api.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (kq?.descriptor) return Array.from(kq.descriptor);
      await new Promise((r) => setTimeout(r, 220));
    }
    return null;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

// ---------- Đăng ký (sau khi đã đăng nhập) ----------
export async function dangKyKhuonMat() {
  const ov = moCamera();
  $('#fvHuy', ov).onclick = () => ov.remove();
  try {
    const emb = await quet(ov);
    if (!ov.isConnected) return false;
    ov.remove();
    if (!emb) { toast('Em chưa bắt được khuôn mặt rõ ạ. Anh/chị thử lại nơi đủ sáng nhé.', 'err', 4600); return false; }
    await rpc('fn_luu_face', { p_embedding: emb });
    localStorage.setItem(KEY, JSON.stringify({ ma_nv: phien.nd().ma_nv, emb }));
    toast(MC.faceDaDangKy);
    return true;
  } catch (e) {
    ov.remove();
    console.error(e);
    toast('Thiết bị chưa chạy được nhận diện ạ. Đăng nhập mật khẩu vẫn hoạt động bình thường.', 'err', 4600);
    return false;
  }
}

export async function huyDangKyKhuonMat() {
  await rpc('fn_xoa_face').catch(() => {});
  xoaFaceLocal();
  toast('Em đã tắt đăng nhập khuôn mặt ạ.');
}

// ---------- Đăng nhập ----------
export async function dangNhapKhuonMat() {
  const local = faceLocal();
  if (!local) return null;
  const ov = moCamera();
  let huy = false;
  $('#fvHuy', ov).onclick = () => { huy = true; ov.remove(); };
  try {
    const emb = await quet(ov);
    if (huy) return null;
    ov.remove();
    if (!emb || dist(emb, local.emb) > NGUONG + 0.1) {
      toast(MC.faceKhongKhop, 'err', 4200);
      return null;
    }
    const data = await rpc('fn_dang_nhap_khuon_mat', {
      p_ma_nv: local.ma_nv, p_embedding: emb,
      p_thiet_bi: navigator.userAgent.slice(0, 120),
    }, false);
    toast(MC.faceThanhCong);
    return data;
  } catch (e) {
    ov.remove();
    if (String(e?.message || '').includes('KHUON_MAT')) toast(MC.faceKhongKhop, 'err', 4200);
    else toast('Thiết bị chưa chạy được nhận diện ạ. Anh/chị dùng mật khẩu giúp em nhé.', 'err', 4600);
    return null;
  }
}
