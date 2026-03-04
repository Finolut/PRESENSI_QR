/**
 * Utility Functions
 */
const Utils = {
  
  /**
   * Format timestamp to readable string
   */
  formatTimestamp(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Format time only
   */
  formatTime(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Generate UUID-like string
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${prefix ? '-' : ''}${timestamp}${random}`;
  },
  
  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  
  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },
  
  /**
   * Get URL parameter
   */
  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },
  
  /**
   * Parse query string to object
   */
  parseQueryString(queryString) {
    const params = {};
    const entries = queryString.split('&');
    
    for (let entry of entries) {
      const [key, value] = entry.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
    
    return params;
  }
};
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}


// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}

function showLoading(show) {
  const overlay = document.getElementById('loading');
  if (!overlay) return;
  
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}