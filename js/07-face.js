// ============================================================
// CÔNG VIỆC — 07-face.js  (v2)
// · Camera 1x thật (applyConstraints zoom=1, aspectRatio 1:1)
// · Vòng ring loading SVG mượt, 4 trạng thái rõ ràng
// · Nhận diện 100% trên thiết bị, ảnh không rời máy
// · Preload model trước → mở overlay là camera bật ngay
// ============================================================
import { MC } from './00-config.js';
import { rpc, phien } from './01-supabase.js';
import { $, ic, toast } from './03-ui.js';

const CDN     = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15';
const NGUONG  = 0.5;
const NGUONG_SERVER = NGUONG + 0.1;
const KEY     = 'cv_face';
const CHUKY_QUET = 260;

let faceapi = null;
let modelPromise = null;

export const faceLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const xoaFaceLocal = () => localStorage.removeItem(KEY);

function napModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const mod = await import(`${CDN}/dist/face-api.esm.js`);
    faceapi = mod;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(`${CDN}/model`),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(`${CDN}/model`),
      faceapi.nets.faceRecognitionNet.loadFromUri(`${CDN}/model`),
    ]);
    return faceapi;
  })().catch((e) => { modelPromise = null; throw e; });
  return modelPromise;
}

export function preloadFaceModel() { napModel().catch(() => {}); }

async function moCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width:  { ideal: 640 },
      height: { ideal: 640 },
      aspectRatio: { ideal: 1 },
      frameRate: { ideal: 24 },
    },
  });
  const track = stream.getVideoTracks()[0];
  try {
    const cap = track.getCapabilities?.();
    if (cap?.zoom) {
      await track.applyConstraints({ advanced: [{ zoom: cap.zoom.min ?? 1 }] });
    }
  } catch {}
  video.srcObject = stream;
  await new Promise((r) => (video.onloadedmetadata = r));
  await video.play().catch(() => {});
  return stream;
}

function taoOverlay() {
  const ov = document.createElement('div');
  ov.className = 'rec-overlay open';
  ov.innerHTML = `
    <div class="face-cage" role="img" aria-label="Camera nhận diện">
      <svg class="face-ring-svg" viewBox="0 0 260 260" aria-hidden="true">
        <circle class="fr-track" cx="130" cy="130" r="122"/>
        <circle class="fr-progress" cx="130" cy="130" r="122"/>
      </svg>
      <div class="face-video-wrap">
        <video id="fvVideo" autoplay playsinline muted></video>
        <div class="face-check">${ic('check')}</div>
      </div>
    </div>
    <p class="rec-hint" id="fvHint">${MC.faceDangQuet}</p>
    <button class="btn btn-quiet" id="fvHuy" style="width:auto;min-width:180px">${ic('x')} Hủy</button>`;
  document.body.appendChild(ov);
  return ov;
}

function setState(ov, state, msg) {
  ov.dataset.state = state;
  if (msg) $('#fvHint', ov).textContent = msg;
}

async function quetVongLap(video, ov, timeoutMs = 9000) {
  const api = faceapi;
  const opts = new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 });
  const t0 = Date.now();
  let khungBatDuoc = 0;
  while (Date.now() - t0 < timeoutMs) {
    if (!ov.isConnected) return null;
    try {
      const kq = await api.detectSingleFace(video, opts)
        .withFaceLandmarks(true).withFaceDescriptor();
      if (kq?.descriptor) {
        khungBatDuoc++;
        if (khungBatDuoc >= 2) return Array.from(kq.descriptor);
        setState(ov, 'dang-tim', 'Em bắt được rồi, giữ yên thêm chút ạ…');
      } else if (khungBatDuoc === 0 && Date.now() - t0 > 1200) {
        setState(ov, 'dang-tim', 'Em chưa thấy khuôn mặt, anh/chị nhìn thẳng camera giúp em ạ.');
      }
    } catch {}
    await new Promise((r) => setTimeout(r, CHUKY_QUET));
  }
  return null;
}

async function chayLuong(ov, timeoutMs) {
  setState(ov, 'dang-tai', 'Em đang chuẩn bị…');
  await napModel();
  setState(ov, 'san-sang', MC.faceDangQuet);
  const video = $('#fvVideo', ov);
  const stream = await moCamera(video);
  try {
    await new Promise((r) => setTimeout(r, 250));
    setState(ov, 'dang-tim', 'Đang tìm khuôn mặt…');
    return await quetVongLap(video, ov, timeoutMs);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

async function dongOverlay(ov, delay = 0) {
  ov.classList.add('closing');
  await new Promise((r) => setTimeout(r, delay + 220));
  ov.remove();
}

export async function dangKyKhuonMat() {
  const ov = taoOverlay();
  let huy = false;
  $('#fvHuy', ov).onclick = () => { huy = true; dongOverlay(ov); };
  try {
    const emb = await chayLuong(ov, 12000);
    if (huy || !ov.isConnected) return false;
    if (!emb) {
      setState(ov, 'that-bai', 'Em chưa bắt được khuôn mặt rõ ạ. Anh/chị thử lại nơi đủ sáng nhé.');
      await dongOverlay(ov, 1400);
      return false;
    }
    setState(ov, 'thanh-cong', 'Xong rồi ạ.');
    await rpc('fn_luu_face', { p_embedding: emb });
    localStorage.setItem(KEY, JSON.stringify({ ma_nv: phien.nd().ma_nv, emb }));
    await dongOverlay(ov, 800);
    toast(MC.faceDaDangKy);
    return true;
  } catch (e) {
    console.error(e);
    setState(ov, 'that-bai', 'Thiết bị chưa chạy được nhận diện ạ. Mật khẩu vẫn hoạt động bình thường.');
    await dongOverlay(ov, 1600);
    return false;
  }
}

export async function huyDangKyKhuonMat() {
  await rpc('fn_xoa_face').catch(() => {});
  xoaFaceLocal();
  toast('Em đã tắt đăng nhập khuôn mặt ạ.');
}

export async function dangNhapKhuonMat() {
  const local = faceLocal();
  if (!local) return null;
  const ov = taoOverlay();
  let huy = false;
  $('#fvHuy', ov).onclick = () => { huy = true; dongOverlay(ov); };
  try {
    const emb = await chayLuong(ov, 10000);
    if (huy || !ov.isConnected) return null;
    if (!emb || dist(emb, local.emb) > NGUONG_SERVER) {
      setState(ov, 'that-bai', MC.faceKhongKhop);
      await dongOverlay(ov, 1400);
      return null;
    }
    setState(ov, 'thanh-cong', MC.faceThanhCong);
    const data = await rpc('fn_dang_nhap_khuon_mat', {
      p_ma_nv: local.ma_nv, p_embedding: emb,
      p_thiet_bi: navigator.userAgent.slice(0, 120),
    }, false);
    await dongOverlay(ov, 700);
    return data;
  } catch (e) {
    setState(ov, 'that-bai',
      String(e?.message || '').includes('KHUON_MAT') ? MC.faceKhongKhop
      : 'Chưa nhận diện được ạ. Anh/chị dùng mật khẩu giúp em nhé.');
    await dongOverlay(ov, 1600);
    return null;
  }
}
