// ============================================================
// CÔNG VIỆC — 04-voice.js
// Ghi âm liền mạch kiểu ChatGPT:
//   · Web Speech API chuyển giọng→chữ LIÊN TỤC trên thiết bị
//   · MediaRecorder ghi song song file âm thanh gốc
//   · ⏸ Tạm dừng → trả văn bản thô để xem/sửa/nói tiếp
//   · ➤ Gửi ngay → trả văn bản đi thẳng vào AI, kèm audio blob
// ============================================================
import { $, ic, toast, rung } from './03-ui.js';
import { MC } from './00-config.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const coGiongNoi = !!SR;

let ctx = null;

export function openRecorder({ startText = '', onDone }) {
  // onDone({ action: 'send'|'pause'|'cancel', text, audioBlob })
  if (ctx) return;
  const ov = document.createElement('div');
  ov.className = 'rec-overlay open';
  ov.innerHTML = `
    <div class="rec-state"><span class="rec-dot"></span><span id="recTime">00:00</span></div>
    <canvas class="rec-wave" id="recWave" width="840" height="220"></canvas>
    <p class="rec-hint">${MC.dangNghe}</p>
    <div class="rec-live" id="recLive"></div>
    <div class="rec-actions">
      <button class="btn btn-quiet" id="recPause">${ic('pause')} Tạm dừng</button>
      <button class="btn btn-gold" id="recSend">${ic('send')} Gửi ngay</button>
    </div>
    <button class="btn btn-sm" id="recCancel" style="width:auto">${ic('x')} Hủy</button>`;
  document.body.appendChild(ov);

  ctx = { ov, onDone, finalText: startText ? startText.trim() + ' ' : '', interim: '',
          rec: null, media: null, chunks: [], stream: null, raf: 0, t0: Date.now(), timer: 0, closing: false };

  batDau().catch((e) => {
    console.error(e);
    toast(MC.loiMang, 'err');
    dong('cancel');
  });

  $('#recPause', ov).onclick = () => { rung(); dong('pause'); };
  $('#recSend', ov).onclick = () => { rung(20); dong('send'); };
  $('#recCancel', ov).onclick = () => dong('cancel');
}

async function batDau() {
  // ---- Micro + waveform ----
  ctx.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const src = ac.createMediaStreamSource(ctx.stream);
  const an = ac.createAnalyser(); an.fftSize = 256;
  src.connect(an);
  const buf = new Uint8Array(an.frequencyBinCount);
  const cv = $('#recWave', ctx.ov), g = cv.getContext('2d');
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#CBA45A';
  const veSong = () => {
    an.getByteFrequencyData(buf);
    g.clearRect(0, 0, cv.width, cv.height);
    const n = 48, w = cv.width / n;
    for (let i = 0; i < n; i++) {
      const v = buf[Math.floor((i / n) * buf.length)] / 255;
      const h = Math.max(8, v * cv.height * 0.92);
      g.fillStyle = gold;
      g.globalAlpha = 0.35 + v * 0.65;
      const x = i * w + w * 0.22;
      g.beginPath();
      g.roundRect(x, (cv.height - h) / 2, w * 0.56, h, 6);
      g.fill();
    }
    ctx.raf = requestAnimationFrame(veSong);
  };
  veSong();
  ctx.ac = ac;

  // ---- Đồng hồ ----
  ctx.timer = setInterval(() => {
    const s = Math.floor((Date.now() - ctx.t0) / 1000);
    $('#recTime', ctx.ov).textContent =
      String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }, 500);

  // ---- Ghi file gốc ----
  try {
    ctx.media = new MediaRecorder(ctx.stream);
    ctx.media.ondataavailable = (e) => e.data.size && ctx.chunks.push(e.data);
    ctx.media.start(1000);
  } catch { ctx.media = null; }

  // ---- Nhận giọng nói liên tục ----
  if (coGiongNoi) {
    const r = new SR();
    r.lang = 'vi-VN'; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let it = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) ctx.finalText += t.trim() + ' ';
        else it += t;
      }
      ctx.interim = it;
      const live = $('#recLive', ctx.ov);
      const full = (ctx.finalText + ctx.interim).trim();
      if (full) { live.classList.add('show'); live.textContent = full; live.scrollTop = live.scrollHeight; }
    };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('SR:', e.error); };
    r.onend = () => { if (ctx && !ctx.closing) { try { r.start(); } catch {} } }; // tự nối lại
    try { r.start(); ctx.rec = r; } catch {}
  } else {
    $('#recLive', ctx.ov).classList.add('show');
    $('#recLive', ctx.ov).textContent = MC.khongNhanGiongNoi;
  }
}

function dong(action) {
  if (!ctx || ctx.closing) return;
  ctx.closing = true;
  const c = ctx;
  cancelAnimationFrame(c.raf);
  clearInterval(c.timer);
  try { c.rec?.stop(); } catch {}
  try { c.ac?.close(); } catch {}

  const ketThuc = (audioBlob) => {
    c.stream?.getTracks().forEach((t) => t.stop());
    c.ov.remove();
    const text = (c.finalText + c.interim).trim();
    ctx = null;
    c.onDone?.({ action, text, audioBlob });
  };

  if (c.media && c.media.state !== 'inactive') {
    c.media.onstop = () =>
      ketThuc(c.chunks.length ? new Blob(c.chunks, { type: c.media.mimeType || 'audio/webm' }) : null);
    try { c.media.stop(); } catch { ketThuc(null); }
  } else ketThuc(null);
}
