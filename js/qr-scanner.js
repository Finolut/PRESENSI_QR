/**
 * QR Scanner Module - FINAL FIXED VERSION
 * Menggunakan html5-qrcode library
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
    
    // ✅ Debug: Cek library
    if (typeof Html5Qrcode === 'undefined') {
      console.error('❌ html5-qrcode library NOT LOADED!');
      console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('qr')));
      if (onError) onError('library_not_loaded');
      return false;
    }
    
    // ✅ Cek container
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container #${containerId} not found!`);
      if (onError) onError('container_not_found');
      return false;
    }
    
    try {
      this.html5QrCode = new Html5Qrcode(containerId);
      console.log('✅ QRScanner initialized');
      return true;
    } catch (error) {
      console.error('❌ Init error:', error);
      if (onError) onError('init_failed: ' + error.message);
      return false;
    }
  },
  
  /**
   * Start scanning - Mobile Friendly
   */
  async start({ cameraId = 'environment', fps = 10, qrbox = 250 } = {}) {
    if (!this.html5QrCode) {
      console.error('❌ Scanner not initialized!');
      return false;
    }
    
    if (this.isScanning) {
      console.warn('⚠️ Already scanning');
      return true;
    }
    
    try {
      console.log('🎯 Starting scanner with camera:', cameraId);
      
      // ✅ Config untuk mobile
      const config = {
        fps: fps,
        qrbox: { width: qrbox, height: qrbox },
        rememberLastUsedCamera: true
      };
      
      // ✅ Coba kamera belakang, fallback ke depan
      let camera = { facingMode: cameraId };
      
      await this.html5QrCode.start(
        camera,
        config,
        // ✅ Success: QR detected
        (decodedText) => {
          console.log('✅ QR scanned:', decodedText);
          this.stop();
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        // ⚠️ Warning: not fatal
        (errorMessage) => {
          // Ignore parsing warnings
        }
      );
      
      this.isScanning = true;
      console.log('✅ Scanner started');
      return true;
      
    } catch (error) {
      console.error('❌ Start error:', error.name, error.message);
      
      // ✅ Fallback: try front camera if back fails
      if (cameraId === 'environment' && error.name === 'OverconstrainedError') {
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
          console.error('❌ Front camera also failed:', e);
        }
      }
      
      // ✅ Error callback
      if (this.onScanError) {
        let code = 'camera_error';
        if (error.name === 'NotAllowedError') code = 'permission_denied';
        else if (error.name === 'NotFoundError') code = 'camera_not_found';
        else if (error.name === 'NotReadableError') code = 'camera_in_use';
        this.onScanError(code);
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
      await this.html5QrCode.stop();
      await this.html5QrCode.clear();
      this.isScanning = false;
      console.log('✅ Scanner stopped');
    } catch (e) {
      console.error('❌ Stop error:', e);
    }
  },
  
  /**
   * Check camera permission
   */
  async checkCameraPermission() {
    try {
      if (navigator.permissions?.query) {
        const r = await navigator.permissions.query({ name: 'camera' });
        return r.state === 'granted';
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * Request camera permission
   */
  async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      console.error('❌ Permission error:', e);
      return false;
    }
  },
  
  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    this.html5QrCode = null;
    this.onScanSuccess = null;
    this.onScanError = null;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRScanner;
}