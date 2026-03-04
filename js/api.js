/**
 * API Client Wrapper
 * Menangani semua request ke backend GAS
 */
const API = {
  
  /**
   * Helper: Fetch dengan error handling standar
   */
async _fetch(endpoint, options = {}) {
const [path, queryString] = endpoint.split('?');

const cleanPath = path.replace(/^\//, '');

let url = `${CONFIG.BASE_URL}?pathInfo=${encodeURIComponent(cleanPath)}`;

if (queryString) {
  url += `&${queryString}`;
}
  
  const config = {
    method: options.method || 'GET',
    headers: {
     'Content-Type': 'text/plain',
      ...options.headers
    },
    ...options
  };
  
  // ✅ Stringify body hanya untuk POST/PUT/PATCH
  if (options.body && config.method !== 'GET') {
    config.body = JSON.stringify(options.body);
  }
  
  try {
    console.log(`📡 Fetching: ${url}`, config);
    
    const response = await fetch(url, config);
    
    // ✅ Ambil text dulu untuk debugging jika JSON parse gagal
    const text = await response.text();
    console.log(`📥 Raw response:`, text.substring(0, 300));
    
    // ✅ Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('❌ Response not valid JSON:', text);
      throw new Error('invalid_response_format');
    }
    
    // ✅ Handle error response dari backend
    if (!data.ok) {
      console.warn('⚠️ Backend error:', data.error);
      throw new Error(data.error || 'Unknown error');
    }
    
    console.log('✅ Success:', data);
    return data.data;
    
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    
    // ✅ Berikan pesan error yang lebih jelas
    if (error.message === 'Failed to fetch') {
      throw new Error('network_error: Cek 1) Deployment "New Version", 2) Access "Anyone", 3) pathInfo di URL');
    }
    
    throw error;
  }
},
  
  /**
   * POST request helper
   */
  async _post(endpoint, body) {
    return this._fetch(endpoint, {
      method: 'POST',
      body
    });
  },
  
  // ============================================
  // 🔐 AUTH ENDPOINTS
  // ============================================
  
  /**
   * Register user baru (auto-role: mahasiswa)
   */
  async register({ name, email, password }) {
    return this._post('/auth/register', {
      name,
      email,
      password
      // role otomatis 'mahasiswa' di backend
    });
  },
  
  /**
   * Login user
   */
  async login({ email, password }) {
    return this._post('/auth/login', {
      email,
      password
    });
  },
  
  // ============================================
  // 📋 PRESENCE ENDPOINTS
  // ============================================
  
  /**
   * Generate QR token untuk sesi aktif
   */
  async generateQrToken({ course_id, session_id, ts }) {
    return this._post('/presence/qr/generate', {
      course_id,
      session_id,
      ts: ts || new Date().toISOString()
    });
  },
  
  /**
   * Mahasiswa check-in dengan QR token
   */
  async checkin({ user_id, device_id, course_id, session_id, qr_token, ts }) {
    return this._post('/presence/checkin', {
      user_id,
      device_id,
      course_id,
      session_id,
      qr_token,
      ts: ts || new Date().toISOString()
    });
  },
  
  /**
   * Cek status presensi user
   */
  async getPresenceStatus({ user_id, course_id, session_id }) {
    const params = new URLSearchParams({
      user_id,
      course_id,
      session_id
    });
    return this._fetch(`/presence/status?${params}`);
  },
  
  /**
   * Get list mahasiswa + status (untuk dosen)
   */
  async getPresenceList({ course_id, session_id }) {
    const params = new URLSearchParams({
      course_id,
      session_id
    });
    return this._fetch(`/presence/list?${params}`);
  },
  
  /**
   * Buat sesi presensi baru (dosen)
   */
  async createSession({ course_id, session_id, tanggal, start_time, end_time }) {
    return this._post('/presence/session/create', {
      course_id,
      session_id,
      tanggal,
      start_time,
      end_time
    });
  },
  
  /**
   * Tutup sesi presensi (dosen)
   */
  async closeSession({ session_internal_id }) {
    return this._post('/presence/session/close', {
      session_internal_id
    });
  },
  
  /**
   * Cek sesi aktif
   */
  async getActiveSession({ course_id, session_id }) {
    const params = new URLSearchParams({
      course_id,
      session_id
    });
    return this._fetch(`/presence/session/active?${params}`);
  },
  
  // ============================================
  // 📊 TELEMETRY ENDPOINTS (Bonus Modules)
  // ============================================
  
  /**
   * Kirim batch accelerometer data
   */
  async sendAccelerometer({ device_id, ts, samples }) {
    return this._post('/telemetry/accel', {
      device_id,
      ts: ts || new Date().toISOString(),
      samples
    });
  },
  
  /**
   * Ambil latest accelerometer data
   */
  async getAccelerometerLatest({ device_id }) {
    const params = new URLSearchParams({ device_id });
    return this._fetch(`/telemetry/accel/latest?${params}`);
  },
  
  /**
   * Log GPS point
   */
  async sendGPS({ device_id, ts, lat, lng, accuracy_m }) {
    return this._post('/telemetry/gps', {
      device_id,
      ts: ts || new Date().toISOString(),
      lat,
      lng,
      accuracy_m
    });
  },
  
  /**
   * Ambil latest GPS untuk marker
   */
  async getGPSLatest({ device_id }) {
    const params = new URLSearchParams({ device_id });
    return this._fetch(`/telemetry/gps/latest?${params}`);
  },
  
  /**
   * Ambil GPS history untuk polyline
   */
  async getGPSHistory({ device_id, limit = 200 }) {
    const params = new URLSearchParams({
      device_id,
      limit: limit.toString()
    });
    return this._fetch(`/telemetry/gps/history?${params}`);
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}