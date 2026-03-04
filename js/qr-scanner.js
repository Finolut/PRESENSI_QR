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
    
    // Pastikan container ada
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`QR container #${containerId} not found`);
      if (onError) onError('container_not_found');
      return;
    }
    
    try {
      this.html5QrCode = new Html5Qrcode(containerId);
    } catch (error) {
      console.error('Failed to init QR scanner:', error);
      if (onError) onError('scanner_init_failed');
    }
  },
  
  /**
   * Start scanning - Buka kamera otomatis
   */
  async start({ cameraId = 'environment', fps = 10, qrbox = 250 } = {}) {
    if (this.isScanning || !this.html5QrCode) {
      return false;
    }
    
    try {
      // Konfigurasi scan
      const config = {
        fps: fps,
        qrbox: { width: qrbox, height: qrbox },
        // Optional: disable flip camera button for simplicity
        rememberLastUsedCamera: true
      };
      
      // Start scanning
      await this.html5QrCode.start(
        { facingMode: cameraId }, // 'environment' = kamera belakang
        config,
        // ✅ Success callback - QR terdeteksi
        (decodedText, decodedResult) => {
          console.log('QR scanned:', decodedText);
          this.stop(); // Stop setelah berhasil scan
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        // ⚠️ Warning callback - scan masih berjalan, bukan error fatal
        (errorMessage) => {
          // Ignore parse errors during scanning
          // console.log('Scan warning:', errorMessage);
        }
      );
      
      this.isScanning = true;
      return true;
      
    } catch (error) {
      console.error('Scan start error:', error);
      
      // Handle specific camera errors
      if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
        if (this.onScanError) this.onScanError('permission_denied');
      } else if (error.name === 'NotFoundError' || error.message?.includes('camera')) {
        if (this.onScanError) this.onScanError('camera_not_found');
      } else {
        if (this.onScanError) this.onScanError(error.message || 'camera_error');
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
    } catch (error) {
      console.error('Scan stop error:', error);
    }
  },
  
  /**
   * Check camera permission (tanpa membuka kamera)
   */
  async checkCameraPermission() {
    try {
      // Query permission status (jika didukung browser)
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'camera' });
        return result.state === 'granted';
      }
      // Fallback: coba akses kamera sebentar
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * Request camera permission - BUKA KAMERA OTOMATIS
   */
  async requestCameraPermission() {
    try {
      // Ini akan memicu popup izin kamera di browser
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Prioritaskan kamera belakang
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Stop stream setelah permission granted (kita buka lagi nanti via html5-qrcode)
      stream.getTracks().forEach(track => track.stop());
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