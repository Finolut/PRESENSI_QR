/**
 * QR Scanner Module
 * Menggunakan html5-qrcode library
 */
const QRScanner = {
  
  html5QrCode: null,
  isScanning: false,
  onScanSuccess: null,
  onScanError: null,
  
  /**
   * Initialize scanner
   */
  init(containerId, onSuccess, onError) {
    this.onScanSuccess = onSuccess;
    this.onScanError = onError;
    
    try {
      this.html5QrCode = new Html5Qrcode(containerId);
    } catch (error) {
      console.error('Failed to init QR scanner:', error);
      if (onError) onError('scanner_init_failed');
    }
  },
  
  /**
   * Start scanning
   */
  async start({ cameraId = 'environment', fps = CONFIG.SCAN_FPS, qrbox = CONFIG.SCAN_QRBOX } = {}) {
    if (this.isScanning) return;
    
    try {
      await this.html5QrCode.start(
        { facingMode: cameraId },
        {
          fps: fps,
          qrbox: { width: qrbox, height: qrbox }
        },
        // Success callback
        (decodedText) => {
          this.stop();
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        // Error callback (scan in progress, not actual error)
        (errorMessage) => {
          // Optional: handle parse errors
          // console.log('QR parse error:', errorMessage);
        }
      );
      
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('Scan start error:', error);
      if (this.onScanError) {
        this.onScanError(error.message || 'camera_error');
      }
      return false;
    }
  },
  
  /**
   * Stop scanning
   */
  async stop() {
    if (!this.isScanning || !this.html5QrCode) return;
    
    try {
      await this.html5QrCode.stop();
      await this.html5QrCode.clear();
      this.isScanning = false;
    } catch (error) {
      console.error('Scan stop error:', error);
    }
  },
  
  /**
   * Check if camera permission is granted
   */
  async checkCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
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
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
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