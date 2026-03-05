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
   * Request camera permission - dengan fallback ke user (depan)
   */
  async requestCameraPermission() {
    console.log('📷 Requesting camera permission...');
    
    try {
      // Coba minta akses kamera (akan coba belakang terlebih dahulu)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Preferable tapi bukan required
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
      console.error('❌ Permission request error:', error.name, error.message);
      
      // Pesan error yang jelas dan actionable
      if (error.name === 'NotAllowedError') {
        alert('❌ Izin kamera ditolak!\n\n📱 Cara mengaktifkan:\n1. Klik menu (3 garis) > Setelan\n2. Cari "Izin" atau "Permissions"\n3. Pilih Kamera > Izinkan\n4. Kembali ke aplikasi ini');
      } else if (error.name === 'NotFoundError') {
        alert('❌ Tidak ada kamera di perangkat Anda.\n\nPastikan perangkat memiliki kamera yang berfungsi.');
      } else if (error.name === 'NotReadableError') {
        alert('❌ Kamera sedang digunakan aplikasi lain!\n\nTutup aplikasi lain yang menggunakan kamera terlebih dahulu.');
      } else if (error.name === 'OverconstrainedError') {
        console.log('📷 Fallback: Constraint tidak terpenuhi, coba lagi dengan constraint lebih fleksibel');
        return true; // Return true untuk coba tetap lanjut
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
   * Start scanning - dengan fallback kamera depan
   */
async start({ cameraId = 'environment', fps = 10, qrbox = 250 } = {}) {
  if (!this.html5QrCode) {
    // Re-init jika hilang
    this.html5QrCode = new Html5Qrcode(this.containerId);
  }
  
  if (this.isScanning) return true;

  const config = {
    fps: fps,
    qrbox: { width: qrbox, height: qrbox },
    aspectRatio: 1.0
  };

  try {
    // Pastikan container benar-benar siap secara visual
    const container = document.getElementById(this.containerId);
    container.style.display = 'block';
    container.style.visibility = 'visible';

    // Coba dengan kamera yang diminta terlebih dahulu
    console.log(`📷 Mencoba start scanner dengan: ${cameraId}`);
    
    await this.html5QrCode.start(
      { facingMode: cameraId },
      config,
      (decodedText) => {
        this.stop();
        if (this.onScanSuccess) this.onScanSuccess(decodedText);
      },
      (errorMessage) => { /* ignore scan failures */ }
    );

    this.isScanning = true;
    console.log('✅ Scanner started dengan ' + cameraId);
    return true;
    
  } catch (error) {
    console.error(`❌ Gagal dengan ${cameraId}:`, error);
    
    // FALLBACK: Jika environment gagal, coba dengan user (kamera depan)
    if (cameraId === 'environment') {
      console.log('📷 Fallback: Mencoba dengan kamera depan (user)...');
      
      try {
        // Bersihkan instance sebelumnya yang gagal
        this.html5QrCode = new Html5Qrcode(this.containerId);
        
        await this.html5QrCode.start(
          { facingMode: 'user' }, // Paksa kamera depan
          config,
          (decodedText) => {
            this.stop();
            if (this.onScanSuccess) this.onScanSuccess(decodedText);
          },
          (errorMessage) => { /* ignore scan failures */ }
        );

        this.isScanning = true;
        console.log('✅ Scanner started dengan kamera depan (user)');
        alert('⚠️ Menggunakan kamera depan');
        return true;
        
      } catch (fallbackError) {
        console.error('❌ Fallback juga gagal:', fallbackError);
        alert('❌ Tidak ada kamera yang tersedia. Pastikan:\n1. Kamera tersedia di perangkat\n2. Izin kamera sudah diberikan\n3. Kamera tidak digunakan aplikasi lain');
        return false;
      }
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
