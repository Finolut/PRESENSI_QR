/**
 * Main Application Controller
 * Handles routing, view switching, and global UI utilities
 */
const App = {
  
  /**
   * Initialize application
   */
  init() {
    this.bindGlobalEvents();
    this.checkAuthAndRoute();
    this.registerServiceWorker();
  },
  
  /**
   * Bind global event listeners
   */
  bindGlobalEvents() {
    // Auth form toggles
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('register-form').classList.remove('hidden');
      e.target.closest('.auth-toggle').classList.add('hidden');
      e.target.closest('.auth-toggle').nextElementSibling.classList.remove('hidden');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
      e.target.closest('.auth-toggle').classList.add('hidden');
      e.target.closest('.auth-toggle').previousElementSibling.classList.remove('hidden');
    });
    
    // Login form submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      await Auth.handleLogin(email, password);
    });
    
    // Register form submit
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        confirm: document.getElementById('register-confirm').value
      };
      await Auth.handleRegister(data);
    });

    const studentLogoutBtn = document.getElementById('student-logout');
    if (studentLogoutBtn) {
      studentLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
    
    const lecturerLogoutBtn = document.getElementById('lecturer-logout');
    if (lecturerLogoutBtn) {
      lecturerLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  },
  
  /**
   * Check auth status and route to appropriate view
   */
  checkAuthAndRoute() {
    if (Auth.isAuthenticated()) {
      const user = Auth.getCurrentUser();
      if (user.role === 'mahasiswa') {
        this.showView('student-dashboard');
        StudentDashboard.init();
      } else if (user.role === 'dosen') {
        this.showView('lecturer-dashboard');
        LecturerDashboard.init();
      }
    } else {
      this.showView('auth-section');
    }
  },
  
  /**
   * Show specific view, hide others
   */
showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
      view.classList.add('hidden');
    });
    
    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
    
    // Update document title
    const titles = {
      'auth-section': '🔐 Login - Presensi QR',
      'student-dashboard': '📱 Dashboard Mahasiswa',
      'lecturer-dashboard': '👨‍🏫 Dashboard Dosen'
    };
    document.title = titles[viewId] || 'Presensi QR';
  },
  
  /**
   * Show/hide loading overlay
   */
  setLoading(loading) {
    const overlay = document.getElementById('loading');
    if (loading) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  },
  
  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  },
  
  /**
   * Register service worker for PWA
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  }
};

// ============================================
// GLOBAL UTILITIES (also in utils.js)
// ============================================

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  const overlay = document.getElementById('loading');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ============================================
// APP INITIALIZATION
// ============================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Handle page visibility (pause polling when tab is hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Optional: pause intervals when tab is not visible
    if (StudentDashboard.refreshInterval) {
      clearInterval(StudentDashboard.refreshInterval);
    }
  } else {
    // Resume when tab is visible
    if (Auth.isAuthenticated() && Auth.getCurrentUser().role === 'mahasiswa') {
      StudentDashboard.startStatusPolling();
    }
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}