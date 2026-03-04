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
  async startScanning() {
    // Check camera permission first
    const hasPermission = await QRScanner.checkCameraPermission();
    if (!hasPermission) {
      const granted = await QRScanner.requestCameraPermission();
      if (!granted) {
        showToast(CONFIG.MESSAGES.permission_denied, 'error');
        return;
      }
    }
    
    // UI updates
    document.getElementById('start-scan-btn').classList.add('hidden');
    document.getElementById('stop-scan-btn').classList.remove('hidden');
    document.getElementById('scan-result').classList.add('hidden');
    
    // Start scanner
    const started = await QRScanner.start();
    if (!started) {
      showToast(CONFIG.MESSAGES.camera_error, 'error');
      this.stopScanning();
    }
  },
  
  /**
   * Stop QR scanning
   */
  stopScanning() {
    QRScanner.stop();
    document.getElementById('start-scan-btn').classList.remove('hidden');
    document.getElementById('stop-scan-btn').classList.add('hidden');
  },
  
  /**
   * Handle successful QR scan
   */
  async handleScanSuccess(qrToken) {
    showLoading(true);
    
    try {
      const result = await API.checkin({
        user_id: this.currentUser.user_id,
        device_id: this.getDeviceId(),
        course_id: this.course_id,
        session_id: this.session_id,
        qr_token: qrToken,
        ts: new Date().toISOString()
      });
      
      // Update UI
      document.getElementById('attendance-status').textContent = '✅ Sudah Absen';
      document.getElementById('attendance-status').className = 'status-badge status-checked';
      document.getElementById('status-hint').textContent = 'Terima kasih, presensi Anda telah tercatat.';
      document.getElementById('scanner-section').classList.add('hidden');
      
      showToast(CONFIG.MESSAGES.checkin_success, 'success');
      
      // Show result
      const resultEl = document.getElementById('scan-result');
      resultEl.textContent = `✓ Check-in berhasil! ID: ${result.presence_id}`;
      resultEl.className = 'scan-result success';
      resultEl.classList.remove('hidden');
      
    } catch (error) {
      // Handle specific errors
      let message = CONFIG.MESSAGES.network_error;
      
      if (error.message === 'token_expired') {
        message = CONFIG.MESSAGES.token_expired;
      } else if (error.message === 'already_checked_in') {
        message = CONFIG.MESSAGES.checkin_already;
        // Still update UI to show checked status
        this.updateStatusToChecked();
      } else if (error.message === 'session_not_active') {
        message = CONFIG.MESSAGES.session_not_active;
      }
      
      showToast(message, 'error');
      
      const resultEl = document.getElementById('scan-result');
      resultEl.textContent = `✗ Gagal: ${error.message}`;
      resultEl.className = 'scan-result error';
      resultEl.classList.remove('hidden');
      
    } finally {
      showLoading(false);
      // Auto-stop scanning after attempt
      this.stopScanning();
    }
  },
  
  /**
   * Handle scan error
   */
  handleScanError(error) {
    console.error('Scan error:', error);
    showToast('Gagal memindai QR', 'error');
    this.stopScanning();
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