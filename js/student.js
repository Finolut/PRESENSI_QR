/**
 * Student Dashboard Module
 */
const StudentDashboard = {
  
  currentUser: null,
  course_id: CONFIG.DEFAULT_COURSE_ID,
  session_id: CONFIG.DEFAULT_SESSION_ID,
  refreshInterval: null,
  
  /**
   * Initialize dashboard
   */
  init() {
    this.currentUser = Auth.getCurrentUser();
    this.setupUI();
    this.bindEvents();
    this.checkAttendanceStatus();
    this.startStatusPolling();
  },
  
  /**
   * Setup UI elements
   */
  setupUI() {
    // Set user info
    document.getElementById('student-name').textContent = this.currentUser.email.split('@')[0];
    document.getElementById('student-nim').textContent = this.currentUser.user_id;
    
    // Set course info (could be dynamic)
    document.getElementById('course-id').textContent = this.course_id;
    document.getElementById('session-id').textContent = this.session_id;
    document.getElementById('session-date').textContent = new Date().toLocaleDateString('id-ID');
    
    // Set default date for session
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('session-date').value = today;
  },
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Logout
    document.getElementById('student-logout').addEventListener('click', () => {
      Auth.logout();
    });
    
    // QR Scanner buttons
    document.getElementById('start-scan-btn').addEventListener('click', () => this.startScanning());
    document.getElementById('stop-scan-btn').addEventListener('click', () => this.stopScanning());
    
    // Initialize QR scanner
    QRScanner.init('qr-reader', 
      // On success
      (qrToken) => this.handleScanSuccess(qrToken),
      // On error
      (error) => this.handleScanError(error)
    );
  },
  
  /**
   * Start QR scanning
   */
/**
 * Start QR scanning - FIXED dengan permission request
 */
// Di student.js, perbarui fungsi startScanning
async startScanning() {
  try {
    const qrReader = document.getElementById('qr-reader');
    // Bersihkan isi container jika ada sisa scanner sebelumnya
    qrReader.innerHTML = ''; 
    
    // Minta izin kamera
    const granted = await QRScanner.requestCameraPermission();
    
    if (!granted) return;

    // Tampilkan tombol stop, sembunyikan tombol start
    document.getElementById('start-scan-btn').classList.add('hidden');
    document.getElementById('stop-scan-btn').classList.remove('hidden');

    // Mulai scanner
    const started = await QRScanner.start();
    
    if (!started) {
       // Coba paksa pakai kamera depan jika environment gagal
       await QRScanner.start({ cameraId: 'user' });
    }
    
    showToast('📷 Kamera aktif!', 'success');
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  }
},
  
  /**
   * Stop QR scanning
   */
stopScanning() {
  QRScanner.stop();
  
  // Reset UI buttons
  document.getElementById('start-scan-btn').classList.remove('hidden');
  document.getElementById('stop-scan-btn').classList.add('hidden');
  
  // Optional: Clear QR reader display
  const qrReader = document.getElementById('qr-reader');
  if (qrReader) {
    // html5-qrcode auto-clears on stop, but we can hide if needed
    // qrReader.innerHTML = '';
  }
},

  
  /**
   * Handle successful QR scan
   */
async handleScanSuccess(qrToken) {
  // Stop scanning immediately after successful scan
  this.stopScanning();
  
  showLoading(true);
  
  try {
    // 1. Kirim check-in ke server
    const result = await API.checkin({
      user_id: this.currentUser.user_id,
      device_id: this.getDeviceId(),
      course_id: this.course_id,
      session_id: this.session_id,
      qr_token: qrToken,
      ts: new Date().toISOString()
    });
    
    // 2. ✅ UPDATE UI - BERHASIL PRESENSI
    document.getElementById('attendance-status').textContent = '✅ Sudah Absen';
    document.getElementById('attendance-status').className = 'status-badge status-checked';
    document.getElementById('status-hint').textContent = 'Presensi Anda telah tercatat.';
    
    // 3. Sembunyikan scanner section (opsional, biar rapi)
    document.getElementById('scanner-section').classList.add('hidden');
    
    // 4. ✅ TAMPILKAN PESAN SUKSES BESAR
    showToast('✅ Berhasil Presensi!', 'success');
    
    // 5. Tampilkan detail di scan-result
    const resultEl = document.getElementById('scan-result');
    resultEl.innerHTML = `
      <strong>✅ Berhasil Presensi!</strong><br>
      <small>ID Presensi: ${result.presence_id || '-'}</small><br>
      <small>Waktu: ${new Date().toLocaleTimeString('id-ID')}</small>
    `;
    resultEl.className = 'scan-result success';
    resultEl.classList.remove('hidden');
    
    // 6. Update status di server (polling)
    this.checkAttendanceStatus();
    
  } catch (error) {
    // ❌ HANDLE ERROR - GAGAL PRESENSI
    let message = 'Gagal Presensi';
    
    if (error.message === 'token_expired') {
      message = '❌ Gagal Presensi: QR sudah kedaluwarsa, silakan scan ulang';
    } else if (error.message === 'already_checked_in') {
      message = '⚠️ Anda sudah absen untuk sesi ini';
      // Tetap update UI ke status checked
      this.updateStatusToChecked();
    } else if (error.message === 'token_invalid') {
      message = '❌ Gagal Presensi: QR tidak valid';
    } else if (error.message === 'session_not_active') {
      message = '❌ Gagal Presensi: Sesi tidak aktif';
    } else {
      message = `❌ Gagal Presensi: ${error.message || 'Koneksi error'}`;
    }
    
    showToast(message, 'error');
    
    // Tampilkan error detail
    const resultEl = document.getElementById('scan-result');
    resultEl.textContent = message;
    resultEl.className = 'scan-result error';
    resultEl.classList.remove('hidden');
    
  } finally {
    showLoading(false);
  }
},
  
  /**
   * Handle scan error
   */
handleScanError(error) {
  console.error('Scan error:', error);
  
  // Stop scanning
  this.stopScanning();
  
  // Tentukan pesan error yang user-friendly
  let message = '❌ Gagal Presensi';
  
  if (error === 'camera_error' || error?.message?.includes('camera')) {
    message = '❌ Gagal Presensi: Kamera tidak dapat diakses';
  } else if (error === 'permission_denied') {
    message = '❌ Gagal Presensi: Izin kamera ditolak';
  } else if (error === 'scanner_init_failed') {
    message = '❌ Gagal Presensi: Scanner tidak dapat diinisialisasi';
  } else {
    message = '❌ Gagal Presensi: Tidak dapat memindai QR';
  }
  
  showToast(message, 'error');
  
  // Tampilkan di scan-result
  const resultEl = document.getElementById('scan-result');
  resultEl.textContent = message;
  resultEl.className = 'scan-result error';
  resultEl.classList.remove('hidden');
},
  
  /**
   * Check attendance status from server
   */
  async checkAttendanceStatus() {
    try {
      const status = await API.getPresenceStatus({
        user_id: this.currentUser.user_id,
        course_id: this.course_id,
        session_id: this.session_id
      });
      
      if (status.status === 'checked_in') {
        this.updateStatusToChecked();
      }
    } catch (error) {
      console.warn('Failed to check status:', error);
    }
  },
  
  /**
   * Update UI to show checked-in status
   */
  updateStatusToChecked() {
    document.getElementById('attendance-status').textContent = '✅ Sudah Absen';
    document.getElementById('attendance-status').className = 'status-badge status-checked';
    document.getElementById('status-hint').textContent = 'Presensi Anda telah tercatat.';
    document.getElementById('scanner-section').classList.add('hidden');
  },
  
  /**
   * Start polling for status updates
   */
  startStatusPolling() {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Poll every 10 seconds
    this.refreshInterval = setInterval(() => {
      this.checkAttendanceStatus();
    }, CONFIG.STATUS_CHECK_INTERVAL);
  },
  
  /**
   * Stop polling
   */
  stopStatusPolling() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },
  
  /**
   * Get unique device ID
   */
  getDeviceId() {
    // Simple device fingerprint
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const platform = navigator.platform;
    const seed = `${ua}-${lang}-${platform}-${screen.width}x${screen.height}`;
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    
    return `web-${Math.abs(hash).toString(36).substring(0, 8)}`;
  },
  
  /**
   * Cleanup on destroy
   */
  destroy() {
    // Stop status polling
    this.stopStatusPolling();
    
    // Stop QR scanner
    if (typeof QRScanner !== 'undefined') {
      QRScanner.destroy();
    }
    
    // Reset UI elements
    const scannerSection = document.getElementById('scanner-section');
    if (scannerSection) {
      scannerSection.classList.remove('hidden');
    }
    
    const statusEl = document.getElementById('attendance-status');
    if (statusEl) {
      statusEl.textContent = '⏳ Belum Absen';
      statusEl.className = 'status-badge status-pending';
    }
    
    // Clear intervals reference
    this.refreshInterval = null;
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudentDashboard;
}