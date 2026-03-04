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
    
    if (this.isScanning) return true;
    
    try {
      const config = {
        fps: fps,
        qrbox: { width: qrbox, height: qrbox },
        // Penting: aspectRatio membantu beberapa browser HP me-render video
        aspectRatio: 1.0 
      };

      // Langsung start tanpa memanggil getUserMedia manual sebelumnya
      await this.html5QrCode.start(
        { facingMode: cameraId },
        config,
        (decodedText) => {
          this.stop();
          if (this.onScanSuccess) this.onScanSuccess(decodedText);
        },
        (errorMessage) => { /* Ignore scan quiet period */ }
      );
      
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('❌ Camera Start Error:', error);
      // Fallback otomatis ke kamera depan jika kamera belakang error (Overconstrained)
      if (cameraId === 'environment') {
        return this.start({ cameraId: 'user' });
      }
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