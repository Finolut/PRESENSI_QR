/**
 * Konfigurasi Aplikasi
 */
const CONFIG = {
  // 🔗 Base URL Backend (Ganti dengan deployment ID Anda)
  BASE_URL: 'https://script.google.com/macros/s/AKfycbxi9U-Fy-KBNtDDMZkpGCmAPNEpApeJh8q2kHLadbEi313CpOOPWpKHE35cwCJ-UBcS/exec',
  
  // 🎓 Default Course & Session (bisa diubah via UI)
  DEFAULT_COURSE_ID: 'cloud-101',
  DEFAULT_SESSION_ID: 'sesi-02',
  
  // ⏱️ QR Token Settings
  QR_REFRESH_INTERVAL: 10000, // 10 detik
  QR_TOKEN_LENGTH: 6,
  
  // 📱 Scanner Settings
  SCAN_FPS: 10,
  SCAN_QRBOX: 250,
  
  // 🔄 Auto-refresh intervals
  STUDENT_LIST_REFRESH: 5000, // 5 detik
  STATUS_CHECK_INTERVAL: 10000, // 10 detik
  
  // 🔐 Auth Storage Keys
  STORAGE_KEYS: {
    USER: 'presensi_user',
    TOKEN: 'presensi_token',
    SESSION: 'presensi_session'
  },
  
  // 🎨 UI Messages
  MESSAGES: {
    login_success: '✅ Login berhasil!',
    register_success: '✅ Pendaftaran berhasil! Silakan login.',
    checkin_success: '✅ Presensi berhasil dicatat!',
    checkin_already: '⚠️ Anda sudah absen untuk sesi ini.',
    token_expired: '⏰ QR sudah kedaluwarsa, silakan scan ulang.',
    session_not_active: '❌ Sesi presensi belum/tidak aktif.',
    network_error: '🌐 Koneksi bermasalah, silakan coba lagi.',
    camera_error: '📷 Tidak dapat mengakses kamera.',
    permission_denied: '🔒 Izin kamera ditolak.'
  }
};

// Export untuk module pattern (jika menggunakan bundler)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}