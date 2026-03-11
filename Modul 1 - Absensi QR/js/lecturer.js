/**
 * Lecturer Dashboard Module
 */
const LecturerDashboard = {
  
  currentUser: null,
  activeSession: null,
  qrRefreshInterval: null,
  studentListInterval: null,
  countdownValue: 10,
  countdownTimer: null,
  
  /**
   * Initialize dashboard
   */
init() {
  this.currentUser = Auth.getCurrentUser();
  console.log('Current user:', this.currentUser);

  if (!this.currentUser) {
    console.error('No authenticated user');
    return;
  }

  this.setupUI();
  this.bindEvents();
  this.setDefaultDateTime();
},
  
  /**
   * Setup UI elements
   */
setupUI() {
  if (!this.currentUser || !this.currentUser.email) {
    console.error('User not found:', this.currentUser);
    return;
  }

  document.getElementById('lecturer-name').textContent =
    this.currentUser.email.split('@')[0];
},
  
  /**
   * Set default date/time for session form
   */
  setDefaultDateTime() {
    const now = new Date();
    
    // Date
    const dateStr = now.toISOString().split('T')[0];
    document.getElementById('session-date').value = dateStr;
    
    // Start time (now)
    const startTime = now.toTimeString().slice(0, 5);
    document.getElementById('session-time').value = startTime;
    
    // End time (now + 2 hours)
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    document.getElementById('session-end').value = endTime.toTimeString().slice(0, 5);
  },
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Logout
    document.getElementById('lecturer-logout').addEventListener('click', () => {
      Auth.logout();
    });
    
    // Create session form
    document.getElementById('session-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateSession();
    });
    
    // Close session button
    document.getElementById('close-session-btn').addEventListener('click', () => {
      this.handleCloseSession();
    });
    
    // Refresh student list
    document.getElementById('refresh-students').addEventListener('click', () => {
      this.fetchStudentList();
    });
    
    // Search student
    document.getElementById('search-student').addEventListener('input', (e) => {
      this.filterStudentList(e.target.value);
    });
  },
  
  /**
   * Handle create new session
   */
  async handleCreateSession() {
    const formData = {
      course_id: document.getElementById('course-id-input').value.trim(),
      session_id: document.getElementById('session-id-input').value.trim(),
      tanggal: document.getElementById('session-date').value,
      start_time: document.getElementById('session-time').value,
      end_time: document.getElementById('session-end').value
    };
    
    // Basic validation
    if (!formData.course_id || !formData.session_id) {
      showToast('Kode mata kuliah dan ID sesi wajib diisi', 'error');
      return;
    }
    
    showLoading(true);
    
    try {
      const result = await API.createSession(formData);
      
      // Store active session
      this.activeSession = {
        ...formData,
        session_internal_id: result.session_internal_id
      };
      
      // Update UI
      document.getElementById('create-session-panel').classList.add('hidden');
      document.getElementById('active-session-panel').classList.remove('hidden');
      document.getElementById('close-session-btn').disabled = false;
      
      // Display active session info
      document.getElementById('active-course-id').textContent = formData.course_id;
      document.getElementById('active-session-id').textContent = formData.session_id;
      document.getElementById('active-start-time').textContent = formData.start_time;
      
      // Start QR generation loop
      this.startQRGeneration();
      
      // Start student list polling
      this.startStudentListPolling();
      
      showToast('✅ Sesi presensi dimulai!', 'success');
      
    } catch (error) {
      showToast(`Gagal memulai sesi: ${error.message}`, 'error');
    } finally {
      showLoading(false);
    }
  },
  
  /**
   * Start QR token generation loop (every 10 seconds)
   */
  async startQRGeneration() {
    // Generate immediately first
    await this.generateAndDisplayQR();
    
    // Then set interval
    this.qrRefreshInterval = setInterval(() => {
      this.generateAndDisplayQR();
    }, CONFIG.QR_REFRESH_INTERVAL);
    
    // Start countdown display
    this.startCountdown();
  },
  
  /**
   * Generate QR token and display
   */
  async generateAndDisplayQR() {
    try {
      const result = await API.generateQrToken({
        course_id: this.activeSession.course_id,
        session_id: this.activeSession.session_id,
        ts: new Date().toISOString()
      });
      
      // Generate QR code image using a simple library or API
      // Using qrserver.com for demo (in production, use client-side QR lib)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.qr_token)}`;
      
      // Display QR
      const qrContainer = document.getElementById('qr-code');
      qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="max-width:100%;border-radius:8px;">`;
      
      // Store current token for reference (optional)
      this.currentQrToken = result.qr_token;
      
      // Reset countdown
      this.resetCountdown();
      
    } catch (error) {
      console.error('Failed to generate QR:', error);
      showToast('Gagal generate QR', 'error');
    }
  },
  
  /**
   * Start countdown timer (10 → 0)
   */
  startCountdown() {
    this.resetCountdown();
    
    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      document.getElementById('session-timer').textContent = this.countdownValue;
      
      if (this.countdownValue <= 0) {
        this.resetCountdown();
      }
    }, 1000);
  },
  
  /**
   * Reset countdown to 10
   */
  resetCountdown() {
    this.countdownValue = 10;
    document.getElementById('session-timer').textContent = this.countdownValue;
  },
  
  /**
   * Stop QR generation
   */
  stopQRGeneration() {
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
      this.qrRefreshInterval = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },
  
  /**
   * Fetch and display student list
   */
async fetchStudentList() {
  if (!this.activeSession) return;
  
  try {
    const students = await API.getPresenceList({
      course_id: this.activeSession.course_id,
      session_id: this.activeSession.session_id
    });
    
    // ✅ Re-render dengan data terbaru
    this.renderStudentList(students);
    
    // Optional: Animasi kecil saat ada perubahan
    this.highlightNewCheckins(students);
    
  } catch (error) {
    console.error('Failed to fetch student list:', error);
    // Jangan tampilkan toast setiap polling error agar tidak spam
    // showToast('Gagal memuat daftar mahasiswa', 'error');
  }
},
  
renderStudentList(students) {
  // Reference ke 2 container
  const pendingContainer = document.getElementById('student-list-pending');
  const checkedContainer = document.getElementById('student-list-checked');
  const countPending = document.getElementById('count-pending');
  const countChecked = document.getElementById('count-checked');
  const totalCount = document.getElementById('student-count');
  
  if (!pendingContainer || !checkedContainer) {
    console.error('Student list containers not found');
    return;
  }
  
  // Handle empty data
  if (!students || students.length === 0) {
    pendingContainer.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada data mahasiswa.</p>
      </div>
    `;
    checkedContainer.innerHTML = `
      <div class="empty-state">
        <p>Belum ada mahasiswa yang absen.</p>
      </div>
    `;
    countPending.textContent = '(0)';
    countChecked.textContent = '(0)';
    totalCount.textContent = '(0)';
    return;
  }
  
  // Split students based on status
  const pending = students.filter(s => s.status !== 'checked_in');
  const checked = students.filter(s => s.status === 'checked_in');
  
  // Update counters
  countPending.textContent = `(${pending.length})`;
  countChecked.textContent = `(${checked.length})`;
  totalCount.textContent = `(${students.length})`;
  
  // Render function helper
  const renderItems = (list, container) => {
    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Tidak ada data.</p>
        </div>
      `;
      return;
    }
    
    // Sort by name
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = sorted.map(student => `
      <div class="student-item" 
           data-name="${student.name.toLowerCase()}" 
           data-nim="${student.user_id}"
           data-user-id="${student.user_id}">
        <div class="student-info">
          <div class="student-name">${escapeHtml(student.name)}</div>
          <div class="student-nim">${escapeHtml(student.user_id)}</div>
        </div>
        <span class="student-status">
          ${student.status === 'checked_in' ? '✓ Absen' : '⏳ Belum'}
        </span>
      </div>
    `).join('');
  };
  
  // Render ke masing-masing kotak
  renderItems(pending, pendingContainer);
  renderItems(checked, checkedContainer);
},
  
  /**
   * Filter student list by search query
   */
  filterStudentList(query) {
    const searchTerm = query.toLowerCase().trim();
    const items = document.querySelectorAll('.student-item');
    
    items.forEach(item => {
      const name = item.dataset.name || '';
      const nim = item.dataset.nim || '';
      
      if (searchTerm === '' || name.includes(searchTerm) || nim.includes(searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  },
  
  /**
   * Start polling student list
   */
  startStudentListPolling() {
    // Fetch immediately
    this.fetchStudentList();
    
    // Then poll every 5 seconds
    this.studentListInterval = setInterval(() => {
      this.fetchStudentList();
    }, CONFIG.STUDENT_LIST_REFRESH);
  },
  
  /**
   * Stop student list polling
   */
  stopStudentListPolling() {
    if (this.studentListInterval) {
      clearInterval(this.studentListInterval);
      this.studentListInterval = null;
    }
  },
  
  /**
   * Handle close session
   */
  async handleCloseSession() {
    if (!confirm('Yakin ingin menutup sesi presensi ini? Mahasiswa tidak bisa check-in lagi.')) {
      return;
    }
    
    showLoading(true);
    
    try {
      await API.closeSession({
        session_internal_id: this.activeSession.session_internal_id
      });
      
      // Stop all polling
      this.stopQRGeneration();
      this.stopStudentListPolling();
      
      // Update UI
      document.getElementById('active-session-panel').classList.add('hidden');
      document.getElementById('create-session-panel').classList.remove('hidden');
      document.getElementById('close-session-btn').disabled = true;
      
      // Clear QR display
      document.getElementById('qr-code').innerHTML = '<p>Sesi telah ditutup</p>';
      
      // Clear active session
      this.activeSession = null;
      
      showToast('✅ Sesi presensi ditutup', 'success');
      
    } catch (error) {
      showToast(`Gagal menutup sesi: ${error.message}`, 'error');
    } finally {
      showLoading(false);
    }
  },
  
  /**
   * Cleanup on destroy
   */
  destroy() {
    // Stop QR generation & countdown
    this.stopQRGeneration();
    
    // Stop student list polling
    this.stopStudentListPolling();
    
    // Reset active session
    this.activeSession = null;
    
    // Reset UI panels
    const createPanel = document.getElementById('create-session-panel');
    const activePanel = document.getElementById('active-session-panel');
    const closeBtn = document.getElementById('close-session-btn');
    
    if (createPanel) createPanel.classList.remove('hidden');
    if (activePanel) activePanel.classList.add('hidden');
    if (closeBtn) closeBtn.disabled = true;
    
    // Clear QR display
    const qrCode = document.getElementById('qr-code');
    if (qrCode) {
      qrCode.innerHTML = '<p>QR akan muncul setelah sesi dimulai</p>';
    }
    
    // Clear intervals
    this.qrRefreshInterval = null;
    this.studentListInterval = null;
    this.countdownTimer = null;
  },
};

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LecturerDashboard;
}
