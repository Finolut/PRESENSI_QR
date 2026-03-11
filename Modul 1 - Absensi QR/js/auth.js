/**
 * Authentication Module
 * Handle login, register, session management
 */
const Auth = {
  
  /**
   * Cek apakah user sudah login
   */
  isAuthenticated() {
    const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    return !!(user && token);
  },
  
  /**
   * Get current user data
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  /**
   * Get auth token
   */
  getToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },
  
  /**
   * Simpan session setelah login/register sukses
   */
  setSession(userData, token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
  },
  
  /**
   * ✅ CLEAR SESSION (LOGOUT)
   */
  clearSession() {
    // Hapus semua data auth dari localStorage
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
    
    // Optional: Hapus juga data dashboard spesifik
    localStorage.removeItem('presensi_active_session');
    localStorage.removeItem('presensi_qr_token');
  },
  
  /**
   * ✅ HANDLE LOGOUT - Reset UI + Redirect ke Login
   */
  logout() {
    // 1. Clear session data
    this.clearSession();
    
    // 2. Stop semua polling/intervals yang berjalan
    if (typeof StudentDashboard !== 'undefined' && StudentDashboard.destroy) {
      StudentDashboard.destroy();
    }
    if (typeof LecturerDashboard !== 'undefined' && LecturerDashboard.destroy) {
      LecturerDashboard.destroy();
    }
    
    // 3. Reset QR Scanner jika masih aktif
    if (typeof QRScanner !== 'undefined' && QRScanner.destroy) {
      QRScanner.destroy();
    }
    
    // 4. Tampilkan notifikasi
    showToast('✅ Anda telah logout', 'success');
    
    // 5. Redirect ke auth section (login page)
    setTimeout(() => {
      // Switch view ke auth-section
      if (typeof App !== 'undefined' && App.showView) {
        App.showView('auth-section');
      } else {
        // Fallback manual jika App module belum load
        document.querySelectorAll('.view').forEach(view => {
          view.classList.remove('active');
          view.classList.add('hidden');
        });
        const authSection = document.getElementById('auth-section');
        if (authSection) {
          authSection.classList.remove('hidden');
          authSection.classList.add('active');
        }
      }
      
      // 6. Reset semua form
      this.resetForms();
      
      // 7. Update document title
      document.title = '🔐 Login - Presensi QR';
      
    }, 500); // Delay kecil agar toast terlihat
  },
  
  /**
   * ✅ Reset semua form di auth section
   */
  resetForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
    // Pastikan login form visible, register form hidden
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    
    // Reset toggle links visibility
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    
    if (showRegisterLink && showRegisterLink.closest('.auth-toggle')) {
      showRegisterLink.closest('.auth-toggle').classList.remove('hidden');
    }
    if (showLoginLink && showLoginLink.closest('.auth-toggle')) {
      showLoginLink.closest('.auth-toggle').classList.add('hidden');
    }
  },
  
  /**
   * Handle Login Form Submit
   */
  async handleLogin(email, password) {
    showLoading(true);
    
    try {
      const response = await API.login({ email, password });
      
      // Simpan session
      Auth.setSession(
        {
          user_id: response.user_id,
          email: response.email,
          role: response.role
        },
        response.token
      );
      
      showToast(CONFIG.MESSAGES.login_success, 'success');
      
      // Redirect berdasarkan role
      setTimeout(() => {
        if (response.role === 'mahasiswa') {
          if (typeof App !== 'undefined' && App.showView) {
            App.showView('student-dashboard');
          }
          if (typeof StudentDashboard !== 'undefined') {
            StudentDashboard.init();
          }
        } else if (response.role === 'dosen') {
          if (typeof App !== 'undefined' && App.showView) {
            App.showView('lecturer-dashboard');
          }
          if (typeof LecturerDashboard !== 'undefined') {
            LecturerDashboard.init();
          }
        }
      }, 500);
      
      return true;
    } catch (error) {
      showToast(`Login gagal: ${error.message}`, 'error');
      return false;
    } finally {
      showLoading(false);
    }
  },
  
  /**
   * Handle Register Form Submit
   */
  async handleRegister({ name, email, password, confirm }) {
    // Validasi client-side
    if (password !== confirm) {
      showToast('Password tidak cocok', 'error');
      return false;
    }
    
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return false;
    }
    
    showLoading(true);
    
    try {
      await API.register({ name, email, password });
      
      showToast(CONFIG.MESSAGES.register_success, 'success');
      
      // Auto-switch to login form
      setTimeout(() => {
        const registerForm = document.getElementById('register-form');
        const loginForm = document.getElementById('login-form');
        if (registerForm) registerForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
      }, 1500);
      
      return true;
    } catch (error) {
      showToast(`Registrasi gagal: ${error.message}`, 'error');
      return false;
    } finally {
      showLoading(false);
    }
  }
};

// Export untuk module pattern
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}