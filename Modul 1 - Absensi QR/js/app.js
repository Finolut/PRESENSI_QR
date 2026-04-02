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
    // Student Form Submit
    const studentForm = document.getElementById('student-entry-form');
    if (studentForm) {
      studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nim = document.getElementById('student-nim-input').value.trim();
        if (nim) {
          localStorage.setItem('PRESQR_USER_ROLE', 'mahasiswa');
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify({ user_id: nim, role: 'mahasiswa' }));
          this.checkAuthAndRoute();
        }
      });
    }

    // Lecturer Button Click
    const lecturerBtn = document.getElementById('btn-lecturer-entry');
    if (lecturerBtn) {
      lecturerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const docId = 'DOC-001'; // Default dummy ID
        localStorage.setItem('PRESQR_USER_ROLE', 'dosen');
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify({ user_id: docId, role: 'dosen' }));
        this.checkAuthAndRoute();
      });
    }

    const studentLogoutBtn = document.getElementById('student-logout');
    if (studentLogoutBtn) {
      studentLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
    
    const lecturerLogoutBtn = document.getElementById('lecturer-logout');
    if (lecturerLogoutBtn) {
      lecturerLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  logout() {
    localStorage.removeItem('PRESQR_USER_ROLE');
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    this.checkAuthAndRoute();
  },
  
  /**
   * Check auth status and route to appropriate view
   */
  checkAuthAndRoute() {
    const role = localStorage.getItem('PRESQR_USER_ROLE');
    if (role === 'mahasiswa') {
      this.showView('student-dashboard');
      if (typeof StudentDashboard !== 'undefined') StudentDashboard.init();
    } else if (role === 'dosen') {
      this.showView('lecturer-dashboard');
      if (typeof LecturerDashboard !== 'undefined') LecturerDashboard.init();
    } else {
      this.showView('role-selection');
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
      'role-selection': '🎓 Presensi QR - Pilih Peran',
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
    if (typeof StudentDashboard !== 'undefined' && StudentDashboard.refreshInterval) {
      clearInterval(StudentDashboard.refreshInterval);
    }
  } else {
    const role = localStorage.getItem('PRESQR_USER_ROLE');
    if (role === 'mahasiswa' && typeof StudentDashboard !== 'undefined') {
      StudentDashboard.startStatusPolling();
    }
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}