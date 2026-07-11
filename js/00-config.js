// ============================================================
// CÔNG VIỆC — 00-config.js
// ⚠️ VERSION BUMP: đổi đồng bộ 3 nơi
//   ① SYS.version (file này)  ② CACHE_VERSION trong sw.js
//   ③ app_settings.cache_version (SQL)
// ============================================================
export const SYS = {
  version: '0.2.14',
  SUPA_URL: 'https://yfpapcepfbnuymfkrcqi.supabase.co',
  SUPA_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcGFwY2VwZmJudXltZmtyY3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTU2OTksImV4cCI6MjA5OTA3MTY5OX0.217nGrPBzVnfxHWWOimJCzVSReMCXwmBxS5Hvx2p0ZU',
  BUCKET: 'bao-cao',
  VAPID_PUBLIC: 'BAKOctpIobn0_A0cm0zKj6dj3dPZAjYoWKklMgRBWPuKtQWkPSdY6Dx6pvzSydfpUN5und9cqAkda8sFHRWhlhw',
};

export const AI_GATEWAY = () => `${SYS.SUPA_URL}/functions/v1/ai-gateway`;

// ---------- MICROCOPY: mọi câu chữ hướng người dùng ----------
export const MC = {
  chao: (tenGoi) => {
    const h = Number(new Intl.DateTimeFormat('vi-VN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    const buoi = h < 11 ? 'buổi sáng' : h < 14 ? 'buổi trưa' : h < 18 ? 'buổi chiều' : 'buổi tối';
    return `Em chào ${tenGoi}, chúc ${tenGoi} ${buoi} tốt lành ạ.`;
  },
  troLyCua: (tenGoi) => `Trợ lý ${tenGoi}`,
  micGoiY: 'Bấm vào mic và nói tự nhiên, em sẽ sắp xếp mọi thứ giúp mình ạ.',
  dangNghe: 'Em đang lắng nghe, anh/chị cứ nói tự nhiên ạ.',
  dangXuLy: 'Em đang sắp xếp lại nội dung, anh/chị chờ em một chút ạ…',
  xemGiup: 'Anh/chị xem giúp em đã đúng ý chưa ạ. Có thể sửa trực tiếp trước khi xác nhận.',
  daLuuBaoCao: 'Em đã lưu báo cáo rồi ạ. Chúc anh/chị hoàn thành tốt công việc.',
  daCheckin: 'Em đã ghi nhận nơi làm việc hôm nay rồi ạ.',
  daLuuKeHoach: 'Em đã đưa vào kế hoạch và sẽ nhắc đúng giờ ạ.',
  daLuuChung: 'Em đã ghi nhận xong ạ.',
  loiMang: 'Mạng đang chập chờn một chút ạ. Em đã giữ lại nội dung, anh/chị thử lại giúp em nhé.',
  loiAI: 'Trợ lý đang bận một chút ạ. Anh/chị thử lại giúp em sau ít phút nhé.',
  loiPhien: 'Phiên làm việc đã hết hạn ạ. Anh/chị vui lòng đăng nhập lại giúp em.',
  thieuDiaDiem: 'Anh/chị bổ sung giúp em nơi công tác để Ban Quản trị tiện theo dõi ạ.',
  chuaCoKeHoach: 'Hôm nay chưa có kế hoạch nào. Anh/chị bấm mic nói cho em nghe, em sắp xếp giúp ạ.',
  chuaCoBaoCao: 'Anh/chị chưa gửi báo cáo hôm nay. Chỉ cần nói vài câu, em soạn giúp ngay ạ.',
  chuaCheckin: 'Hôm nay anh/chị làm việc ở đâu ạ?',
  xacNhanXoa: 'Anh/chị muốn em hủy mục này phải không ạ? Em sẽ không thể khôi phục lại được.',
  saiTaiKhoan: 'Mã nhân viên hoặc mật khẩu chưa đúng ạ. Anh/chị kiểm tra lại giúp em nhé.',
  taiKhoanKhoa: 'Tài khoản đang tạm khóa ạ. Anh/chị liên hệ Quản trị viên giúp em nhé.',
  doiMkThanhCong: 'Em đã đổi mật khẩu thành công ạ.',
  khongNhanGiongNoi: 'Thiết bị này chưa hỗ trợ nhận giọng nói ạ. Anh/chị có thể gõ nội dung, em vẫn hỗ trợ chuẩn hóa như thường.',
  faceDangQuet: 'Anh/chị nhìn thẳng vào camera giúp em vài giây ạ…',
  faceThanhCong: 'Em nhận ra rồi ạ. Chào mừng anh/chị quay lại.',
  faceKhongKhop: 'Em chưa nhận ra được ạ. Anh/chị đăng nhập bằng mật khẩu giúp em nhé.',
  faceDaDangKy: 'Em đã ghi nhớ khuôn mặt. Lần sau chỉ cần một chạm là vào ạ.',
  pushDaBat: 'Em sẽ nhắc anh/chị qua thông báo kể cả khi không mở app ạ.',
  pushTuChoi: 'Thiết bị đang chặn thông báo ạ. Anh/chị bật lại trong Cài đặt của máy giúp em nhé.',
};

// Bản đồ lỗi RPC → lời người
export const ERR_MAP = {
  SAI_TAI_KHOAN: MC.saiTaiKhoan,
  TAI_KHOAN_KHOA: MC.taiKhoanKhoa,
  PHIEN_HET_HAN: MC.loiPhien,
  THIEU_DIA_DIEM: MC.thieuDiaDiem,
  SAI_MAT_KHAU_CU: 'Mật khẩu hiện tại chưa đúng ạ.',
  MAT_KHAU_NGAN: 'Mật khẩu cần tối thiểu 6 ký tự ạ.',
  CHUA_CHECKIN: 'Anh/chị cập nhật nơi làm việc hôm nay trước, rồi em ghi di chuyển sau ạ.',
  BAO_CAO_TRONG: 'Nội dung báo cáo đang trống ạ.',
  KHONG_CO_QUYEN: 'Tài khoản của anh/chị không có quyền thao tác này ạ.',
};
export const loiNguoi = (e) => {
  const m = String(e?.message || e || '');
  for (const k of Object.keys(ERR_MAP)) if (m.includes(k)) return ERR_MAP[k];
  if (m.toLowerCase().includes('fetch') || m.toLowerCase().includes('network')) return MC.loiMang;
  return 'Có trục trặc nhỏ ạ: ' + m;
};
