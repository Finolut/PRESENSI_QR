/**
 * QR Scanner Module - FINAL VERSION
 */
const QRScanner = {
  html5QrCode: null,
  isScanning: false,
  onScanSuccess: null,
  onScanError: null,
  containerId: null,
  
  /**
   * Initialize scanner
   */
  init(containerId, onSuccess, onError) {
    this.containerId = containerId;
    this.onScanSuccess = onSuccess;
    this.onScanError = onError;
    
    // Cek library loaded
    if (typeof Html5Qrcode === 'undefined') {
      console.error('❌ html5-qrcode library NOT LOADED');
      if (onError) onError('library_not_loaded');
      return false;
    }
    
    // Cek container
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container #${containerId} not found`);
      if (onError) onError('container_not_found');
      return false;
    }
    
    try {
      this.html5QrCode = new Html5Qrcode(containerId);
      console.log('✅ QRScanner initialized');
      return true;
    } catch (error) {
      console.error('❌ Init error:', error);
      if (onError) onError('init_failed');
      return false;
    }
  },
  
  /**
   * Request camera permission - PASTIKAN POPUP MUNCUL
   */
  async requestCameraPermission() {
    console.log('📷 Requesting camera permission...');
    
    try {
      // Ini akan MEMAKSA popup permission muncul
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      console.log('✅ Permission granted');
      
      // Stop stream (akan dibuka lagi oleh html5-qrcode)
      stream.getTracks().forEach(track => track.stop());
      
      return true;
      
    } catch (error) {
      console.error('❌ Permission denied:', error.name);
      
      // Pesan error yang jelas
      if (error.name === 'NotAllowedError') {
        alert('❌ Izin kamera ditolak!\n\nSilakan buka pengaturan browser dan izinkan akses kamera untuk website ini.');
      } else if (error.name === 'NotFoundError') {
        alert('❌ Kamera tidak ditemukan di perangkat ini.');
      } else if (error.name === 'NotReadableError') {
        alert('❌ Kamera sedang digunakan aplikasi lain.');
      } else {
        alert('❌ Gagal mengakses kamera: ' + error.message);
      }
      
      return false;
    }
  },
  
  /**
   * Check camera permission
   */
  async checkCameraPermission() {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' });
        console.log('📷 Permission status:', result.state);
        
        if (result.state === 'denied') {
          alert('⚠️ Izin kamera ditolak. Silakan izinkan di pengaturan browser.');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.warn('⚠️ Cannot check permission:', error);
      return true;
    }
  },
  
  /**
   * Start scanning
   */
  async start({ cameraId = 'environment', fps = 10, qrbox = 250 } = {}) {
    if (!this.html5QrCode) {
      console.error('❌ Scanner not initialized');
      alert('Error: Scanner belum siap. Silakan refresh halaman.');
      return false;
    }
    
    if (this.isScanning) {
      console.warn('⚠️ Already scanning');
      return true;
    }
    
    try {
      console.log('🎯 Starting scanner...');
      
      // Pastikan container visible
      const container = document.getElementById(this.containerId);
      if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.minHeight = '300px';
        container.style.background = '#000';
      }
      
      // Config
      const config = {
        fps: fps,
        qrbox: { width: qrbox, height: qrbox },
        rememberLastUsedCamera: true
      };
      
      // Start scanning
      await this.html5QrCode.start(
        { facingMode: cameraId },
        config,
        // Success
        (decodedText) => {
          console.log('✅ QR detected:', decodedText);
          this.stop();
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        // Warning (bukan error)
        (errorMessage) => {
          // Ignore
        }
      );
      
      this.isScanning = true;
      console.log('✅ Scanner started');
      return true;
      
    } catch (error) {
      console.error('❌ Start error:', error.name, error.message);
      
      // Fallback ke kamera depan jika belakang gagal
      if (cameraId === 'environment' && 
          (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
        console.log('🔄 Trying front camera...');
        try {
          await this.html5QrCode.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            this.onScanSuccess,
            () => {}
          );
          this.isScanning = true;
          return true;
        } catch (e) {
          console.error('❌ Front camera also failed');
        }
      }
      
      // Error handling
      let msg = 'Gagal membuka kamera';
      if (error.name === 'NotAllowedError') {
        msg = 'Izin kamera ditolak';
      } else if (error.name === 'NotFoundError') {
        msg = 'Kamera tidak ditemukan';
      } else if (error.name === 'NotReadableError') {
        msg = 'Kamera sedang digunakan';
      }
      
      alert('❌ ' + msg);
      
      if (this.onScanError) {
        this.onScanError(error.name);
      }
      
      this.isScanning = false;
      return false;
    }
  },
  
  /**
   * Stop scanning
   */
  async stop() {
    if (!this.isScanning || !this.html5QrCode) {
      this.isScanning = false;
      return;
    }
    
    try {
      console.log('⏹️ Stopping scanner...');
      await this.html5QrCode.stop();
      await this.html5QrCode.clear();
      this.isScanning = false;
      console.log('✅ Scanner stopped');
    } catch (error) {
      console.error('❌ Stop error:', error);
    }
  },
  
  /**
   * Destroy
   */
  destroy() {
    console.log('🗑️ Destroying scanner...');
    this.stop();
    this.html5QrCode = null;
    this.onScanSuccess = null;
    this.onScanError = null;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRScanner;
}