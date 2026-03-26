/**
 * SISTEM PRESENSI QR DINAMIS
 * Versi B: Updated dengan integrasi GPS + Session
 * API Contract Simple v1
 */

// ============================================
// KONFIGURASI & UTILITIES
// ============================================

const SPREADSHEET_ID = '1sudJcM2gs6Xg6KTxiwEc6um2vQ3FSRP-ss8jPLaJXJ8'; // Ganti ID jika perlu
const SHEETS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  TOKENS: 'tokens',
  PRESENCE: 'presence',
  ACCELEROMETER: 'accelerometer'
};

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initializeHeaders(sheet, name);
  }
  return sheet;
}

function initializeHeaders(sheet, name) {
  const headers = {
    'users': ['user_id', 'name', 'email', 'password_hash', 'role', 'created_at'],
    'sessions': ['session_internal_id', 'course_id', 'session_id', 'tanggal', 'start_time', 'end_time', 'is_active', 'created_by', 'created_at'],
    'tokens': ['session_internal_id', 'qr_token', 'expires_at', 'created_at', 'is_valid'],
    'presence': ['presence_id', 'user_id', 'course_id', 'session_id', 'session_internal_id', 'device_id', 'status', 'ts'],
    'accelerometer': ['timestamp', 'user_id', 'session_id', 'device_id', 'x_axis', 'y_axis', 'z_axis'],
    'gps': ['timestamp', 'device_id', 'user_id', 'session_id', 'lat', 'lng', 'accuracy_m'] // Ditambahkan session_id
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
  }
}

// ============================================
// TELEMETRY MODULE - ACCELEROMETER
// ============================================
function handleAccelerometerBatch(body) {
  const samples = body.samples;
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    if (Array.isArray(body)) {
      return errorResponse('Gunakan format Modul 2: {device_id, samples: [...]}');
    }
    return errorResponse('missing_samples_array');
  }
  const sheet = getSheet(SHEETS.ACCELEROMETER);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowsToInsert = [];
  
  for (let i = 0; i < samples.length; i++) {
    const item = samples[i];
    const rowData = {
      timestamp: item.t || new Date().toISOString(),
      user_id: body.user_id || 'unknown',
      session_id: body.session_id || 'unknown',
      device_id: body.device_id || 'unknown',
      x_axis: item.x !== undefined ? item.x : 0,
      y_axis: item.y !== undefined ? item.y : 0,
      z_axis: item.z !== undefined ? item.z : 0
    };
    const rowArray = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
    rowsToInsert.push(rowArray);
  }
  
  if (rowsToInsert.length > 0) {
    const lastRow = sheet.getLastRow() || 1;
    sheet.getRange(lastRow + 1, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
  }
  return successResponse({ accepted: rowsToInsert.length, message: 'sukses masuk sheet' });
}

function handleGetLatestAccelerometer(e) {
  const device_id = e.parameter.device_id;
  if (!device_id) return errorResponse('missing_parameter: device_id');
  
  const sheet = getSheet(SHEETS.ACCELEROMETER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return errorResponse('data_not_found_for_device');
  const headers = data[0];
  const devIdx = headers.indexOf('device_id');
  const historyData = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][devIdx] === device_id) {
      historyData.push({
        t: data[i][headers.indexOf('timestamp')],
        x: data[i][headers.indexOf('x_axis')] || 0,
        y: data[i][headers.indexOf('y_axis')] || 0,
        z: data[i][headers.indexOf('z_axis')] || 0
      });
    }
  }
  if (historyData.length > 0) return successResponse(historyData);
  return errorResponse('data_not_found_for_device');
}

// ============================================
// TELEMETRY MODULE - GPS (MODUL 3)
// ============================================

function handleGPSLog(body) {
  const { device_id, ts, lat, lng, accuracy_m, user_id, session_id } = body;
  if (!device_id || lat === undefined || lng === undefined) {
    return errorResponse('missing_gps_fields');
  }

  const sheet = getSheet('gps'); 
  // Paksa bikin header jika sheet 'gps' baru saja dibuat dan kosong
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
     sheet.getRange(1, 1, 1, 7).setValues([['timestamp', 'device_id', 'user_id', 'session_id', 'lat', 'lng', 'accuracy_m']]);
  }

  const rowData = {
    timestamp: ts || new Date().toISOString(),
    device_id: device_id,
    user_id: user_id || 'unknown',
    session_id: session_id || 'unknown',
    lat: lat,
    lng: lng,
    accuracy_m: accuracy_m || 0
  };

  addRow('gps', rowData);
  return successResponse({ message: 'GPS location recorded successfully', accepted: true });
}

function handleGetGPSHistory(e) {
  const device_id = e.parameter.device_id;
  const limit = parseInt(e.parameter.limit) || 200;
  if (!device_id) return errorResponse('missing_parameter: device_id');

  const sheet = getSheet('gps');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return errorResponse('data_not_found_for_device');
  
  const headers = data[0];
  const devIdx = headers.indexOf('device_id');
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][devIdx] === device_id) {
      items.push({
        ts: data[i][headers.indexOf('timestamp')],
        lat: parseFloat(data[i][headers.indexOf('lat')] || 0),
        lng: parseFloat(data[i][headers.indexOf('lng')] || 0),
        accuracy_m: parseFloat(data[i][headers.indexOf('accuracy_m')] || 0)
      });
    }
  }

  const slicedItems = items.length > limit ? items.slice(-limit) : items;
  if(slicedItems.length === 0) return errorResponse('data_not_found_for_device');

  return successResponse({ device_id: device_id, items: slicedItems });
}

// ============================================
// HELPERS
// ============================================

function generateId(prefix) {
  const timestamp = new Date().getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

function generateQrToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKN-${token}`;
}

function successResponse(data = {}) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
}

function readRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try { return JSON.parse(e.postData.contents); } catch (err) { return null; }
}

function hashPassword(password) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));
}

function findRowByColumn(sheetName, columnName, value) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  const headers = data[0];
  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

function addRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  let headers = [];
  if (data.length > 0) {
    headers = data[0];
  } else {
    headers = Object.keys(rowData);
    sheet.appendRow(headers);
  }
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
  return true;
}

function updateRow(sheetName, rowIndex, updates) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach((header, idx) => {
    if (updates[header] !== undefined) {
      sheet.getRange(rowIndex, idx + 1).setValue(updates[header]);
    }
  });
  return true;
}

// ============================================
// ROUTING - GET & POST
// ============================================

function doGet(e) {
  try {
    const path = getPathInfo(e);
    if (path === '/auth/me') return handleGetAuthMe(e);
    if (path === '/presence/status') return handleGetPresenceStatus(e);
    if (path === '/presence/list') return handleGetPresenceList(e);
    if (path === '/presence/session/active') return handleGetActiveSession(e);
    if (path === '/presence/session/all') return handleGetAllSessions(e);
    if (path === '/schedule/weekly') return handleGetWeeklySchedule(e);
    if (path === '/presence/history') return handleGetAttendanceHistory(e);
    
    if (path === '/telemetry/accel/latest') return handleGetLatestAccelerometer(e);
    if (path === '/telemetry/gps/history') return handleGetGPSHistory(e);
    
    return errorResponse('endpoint_not_found');
  } catch (err) {
    return errorResponse('server_error: ' + err.message);
  }
}

function doPost(e) {
  try {
    const path = getPathInfo(e);
    
    let body = null;
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } 
      catch (err) { Logger.log('Gagal parse JSON'); }
    }
    
    if (!body) return errorResponse('invalid_json_or_empty');
    if (path === '/auth/register') return handleRegister(body);
    if (path === '/auth/login') return handleLogin(body);
    if (path === '/presence/session/create') return handleCreateSession(body);
    if (path === '/presence/qr/generate') return handleGenerateQr(body);
    if (path === '/presence/checkin') return handleCheckin(body);
    if (path === '/presence/session/close') return handleCloseSession(body);
    if (path === '/telemetry/accel') return handleAccelerometerBatch(body);
    
    // NEW ROUTE MODUL 3: Menerima POST Titik GPS dari Mahasiswa
    if (path === '/telemetry/gps') return handleGPSLog(body);
    
    return errorResponse('endpoint_not_found');
  } catch (err) {
    return errorResponse('server_error: ' + err.message);
  }
}

function getPathInfo(e) {
  if (e.parameter && e.parameter.pathInfo) return '/' + e.parameter.pathInfo;
  if (e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      if (body._endpoint) return '/' + body._endpoint;
    } catch(err) {}
  }
  return null;
}

// ============================================
// AUTHENTICATION & PRESENCE MODULE LOGICS
// ============================================

function handleRegister(body) {
  const { name, email, password } = body;
  if (!name || !email || !password) return errorResponse('missing_field');
  if (!isValidEmail(email)) return errorResponse('invalid_email_format');
  if (password.length < 6) return errorResponse('password_too_short');
  
  const existing = findRowByColumn(SHEETS.USERS, 'email', email);
  if (existing) return errorResponse('email_already_registered');
  
  const userId = generateId('USR');
  const userData = {
    user_id: userId, name: name.trim(), email: email.toLowerCase().trim(),
    password_hash: hashPassword(password), role: 'mahasiswa', created_at: new Date().toISOString()
  };
  addRow(SHEETS.USERS, userData);
  return successResponse({ user_id: userId, name: userData.name, email: userData.email, role: userData.role });
}

function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function handleLogin(body) {
  const { email, password } = body;
  if (!email || !password) return errorResponse('missing_field');
  const user = findRowByColumn(SHEETS.USERS, 'email', email);
  if (!user) return errorResponse('invalid_credentials');
  
  const inputHash = hashPassword(password);
  if (String(user.rowData[user.headers.indexOf('password_hash')]) !== String(inputHash)) {
    return errorResponse('invalid_credentials');
  }
  const sessionToken = generateId('SES');
  return successResponse({ user_id: user.rowData[user.headers.indexOf('user_id')], role: user.rowData[user.headers.indexOf('role')], token: sessionToken });
}

function handleGetAuthMe(e) { return errorResponse('not_implemented'); }

function handleCreateSession(body) {
  const { course_id, session_id, tanggal, start_time, end_time } = body;
  if (!course_id || !session_id || !tanggal || !start_time || !end_time) return errorResponse('missing_field');
  
  const existingActive = findActiveSession(course_id, session_id);
  if (existingActive) return errorResponse('session_already_active');
  
  const sessionInternalId = generateId('SES');
  const sessionData = {
    session_internal_id: sessionInternalId, course_id: course_id, session_id: session_id,
    tanggal: tanggal, start_time: start_time, end_time: end_time, is_active: true,
    created_by: 'DOC-001', created_at: new Date().toISOString()
  };
  addRow(SHEETS.SESSIONS, sessionData);
  return successResponse({ session_internal_id: sessionInternalId });
}

function findActiveSession(course_id, session_id) {
  const sheet = getSheet(SHEETS.SESSIONS);
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return null;
  const headers = data[0];
  const courseIdx = headers.indexOf('course_id');
  const sessionIdx = headers.indexOf('session_id');
  const activeIdx = headers.indexOf('is_active');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][courseIdx]) === String(course_id) && 
        String(data[i][sessionIdx]) === String(session_id) && 
        data[i][activeIdx] === true) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

function handleGetActiveSession(e) {
  const { course_id, session_id } = e.parameter;
  if (!course_id || !session_id) return errorResponse('missing_field');
  const session = findActiveSession(course_id, session_id);
  if (!session) return errorResponse('session_not_active');
  return successResponse({
    session_internal_id: session.rowData[session.headers.indexOf('session_internal_id')],
    course_id: course_id, session_id: session_id, is_active: true
  });
}

function handleGetAllSessions(e) {
  const sheet = getSheet(SHEETS.SESSIONS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return successResponse([]);
  
  const headers = data[0];
  const sessions = [];
  
  for (let i = 1; i < data.length; i++) {
    sessions.push({
      session_internal_id: data[i][headers.indexOf('session_internal_id')],
      course_id: data[i][headers.indexOf('course_id')],
      session_id: data[i][headers.indexOf('session_id')],
      tanggal: data[i][headers.indexOf('tanggal')],
      is_active: data[i][headers.indexOf('is_active')]
    });
  }
  return successResponse(sessions);
}

function handleGenerateQr(body) {
  const { course_id, session_id } = body;
  if (!course_id || !session_id) return errorResponse('missing_field');
  
  const session = findActiveSession(course_id, session_id);
  if (!session) return errorResponse('session_not_active');
  
  const sessionInternalId = session.rowData[session.headers.indexOf('session_internal_id')];
  invalidateOldTokens(sessionInternalId);
  
  const qrToken = generateQrToken();
  const expiresAt = new Date(new Date().getTime() + 20000);
  const tokenData = {
    session_internal_id: sessionInternalId, qr_token: qrToken,
    expires_at: expiresAt.toISOString(), created_at: new Date().toISOString(), is_valid: true
  };
  addRow(SHEETS.TOKENS, tokenData);
  return successResponse({ qr_token: qrToken, expires_at: expiresAt.toISOString() });
}

function invalidateOldTokens(sessionInternalId) {
  const sheet = getSheet(SHEETS.TOKENS);
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return;
  const headers = data[0];
  const sessionIdx = headers.indexOf('session_internal_id');
  const validIdx = headers.indexOf('is_valid');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionIdx]) === String(sessionInternalId) && data[i][validIdx] === true) {
      sheet.getRange(i + 1, validIdx + 1).setValue(false);
    }
  }
}

function handleCheckin(body) {
  const { user_id, device_id, course_id, session_id, qr_token, ts } = body;
  if (!user_id || !device_id || !course_id || !session_id || !qr_token) return errorResponse('missing_field');
  
  const session = findActiveSession(course_id, session_id);
  if (!session) return errorResponse('session_not_active');
  const sessionInternalId = String(session.rowData[session.headers.indexOf('session_internal_id')]);
  
  const token = findValidToken(sessionInternalId, qr_token);
  if (!token) return errorResponse('token_invalid');
  if (new Date() > new Date(token.rowData[token.headers.indexOf('expires_at')])) return errorResponse('token_expired');
  
  if (findExistingCheckin(user_id, sessionInternalId)) return errorResponse('already_checked_in');
  
  const presenceId = generateId('PR');
  const presenceData = {
    presence_id: presenceId, user_id: user_id, course_id: String(course_id),
    session_id: String(session_id), session_internal_id: sessionInternalId,
    device_id: device_id, status: 'checked_in', ts: ts || new Date().toISOString()
  };
  addRow(SHEETS.PRESENCE, presenceData);
  return successResponse({ presence_id: presenceId, status: 'checked_in' });
}

function findValidToken(sessionInternalId, qrToken) {
  const sheet = getSheet(SHEETS.TOKENS);
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return null;
  const headers = data[0];
  const sessionIdx = headers.indexOf('session_internal_id');
  const tokenIdx = headers.indexOf('qr_token');
  const validIdx = headers.indexOf('is_valid');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionIdx]) === String(sessionInternalId) && 
        String(data[i][tokenIdx]) === String(qrToken) && data[i][validIdx] === true) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

function findExistingCheckin(userId, sessionInternalId) {
  const sheet = getSheet(SHEETS.PRESENCE);
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return false;
  const headers = data[0];
  const userIdx = headers.indexOf('user_id');
  const sessionIdx = headers.indexOf('session_internal_id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]) === String(userId) && String(data[i][sessionIdx]) === String(sessionInternalId)) return true;
  }
  return false;
}

function handleGetPresenceStatus(e) {
  const { user_id, course_id, session_id } = e.parameter;
  if (!user_id || !course_id || !session_id) return errorResponse('missing_field');
  
  const session = findRowByColumn(SHEETS.SESSIONS, 'session_id', session_id);
  if (!session) return errorResponse('session_not_found');
  const sessionInternalId = session.rowData[session.headers.indexOf('session_internal_id')];
  
  const presence = findRowByColumn(SHEETS.PRESENCE, 'user_id', user_id);
  if (presence && String(presence.rowData[presence.headers.indexOf('session_internal_id')]) === String(sessionInternalId)) {
    return successResponse({ user_id: user_id, course_id: course_id, session_id: session_id, status: 'checked_in', last_ts: presence.rowData[presence.headers.indexOf('ts')]});
  }
  return successResponse({ user_id: user_id, course_id: course_id, session_id: session_id, status: 'not_yet', last_ts: null });
}

function handleGetPresenceList(e) {
  const { course_id, session_id } = e.parameter;
  if (!course_id || !session_id) return errorResponse('missing_field');
  
  const session = findActiveSession(course_id, session_id) || findRowByColumn(SHEETS.SESSIONS, 'session_id', session_id);
  if (!session) return errorResponse('session_not_found');
  const sessionInternalId = session.rowData[session.headers.indexOf('session_internal_id')];
  
  const usersSheet = getSheet(SHEETS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const userHeaders = usersData[0];
  
  const presenceSheet = getSheet(SHEETS.PRESENCE);
  const presenceData = presenceSheet.getDataRange().getValues();
  const checkedInUsers = new Set();
  
  if (presenceData.length > 1) {
    const pSessIdx = presenceData[0].indexOf('session_internal_id');
    const pUserIdx = presenceData[0].indexOf('user_id');
    for (let i = 1; i < presenceData.length; i++) {
      if (String(presenceData[i][pSessIdx]) === String(sessionInternalId)) {
        checkedInUsers.add(String(presenceData[i][pUserIdx]));
      }
    }
  }

  // Ambil lokasi GPS dari sheet gps untuk sesi ini
  const gpsSheet = getSheet('gps');
  let gpsData = [];
  try {
     gpsData = gpsSheet.getDataRange().getValues();
  } catch (err) {}
  
  const latestGps = {};
  if (gpsData.length > 1) {
    const gHeaders = gpsData[0];
    const gSessIdx = gHeaders.indexOf('session_id');
    const gUserIdx = gHeaders.indexOf('user_id');
    const gLatIdx = gHeaders.indexOf('lat');
    const gLngIdx = gHeaders.indexOf('lng');
    
    // Looping dari atas ke bawah untuk mengambil titik GPS terbaru. 
    for (let i = 1; i < gpsData.length; i++) {
      if (String(gpsData[i][gSessIdx]) === String(session_id)) {
        const uid = String(gpsData[i][gUserIdx]);
        latestGps[uid] = { lat: gpsData[i][gLatIdx], lng: gpsData[i][gLngIdx] };
      }
    }
  }
  
  const result = [];
  const roleIdx = userHeaders.indexOf('role');
  const userIdIdx = userHeaders.indexOf('user_id');
  const nameIdx = userHeaders.indexOf('name');
  
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][roleIdx] === 'mahasiswa') {
      const uId = String(usersData[i][userIdIdx]);
      const status = checkedInUsers.has(uId) ? 'checked_in' : 'not_yet';
      const userLoc = latestGps[uId] || null;
      
      result.push({ 
        user_id: uId, 
        name: usersData[i][nameIdx], 
        status: status,
        lat: userLoc ? parseFloat(userLoc.lat) : null,
        lng: userLoc ? parseFloat(userLoc.lng) : null
      });
    }
  }
  return successResponse(result);
}

function handleCloseSession(body) {
  const { session_internal_id } = body;
  if (!session_internal_id) return errorResponse('missing_field');
  const session = findRowByColumn(SHEETS.SESSIONS, 'session_internal_id', session_internal_id);
  if (!session) return errorResponse('session_not_found');
  
  updateRow(SHEETS.SESSIONS, session.rowIndex, { is_active: false });
  invalidateOldTokens(session_internal_id);
  return successResponse({ message: 'session_closed' });
}

function handleGetWeeklySchedule(e) {
  const day = e.parameter.day || 'senin';
  const sheet = getSheet('schedules');
  const data = sheet.getDataRange().getValues();
  const headers = data[0] || [];
  const dayIdx = headers.indexOf('day');
  const courses = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][dayIdx] === day) {
      courses.push({
        course_id: data[i][headers.indexOf('course_id')], course_name: data[i][headers.indexOf('course_name')],
        class_code: data[i][headers.indexOf('class_code')], lecturer: data[i][headers.indexOf('lecturer')],
        time: data[i][headers.indexOf('time')], room: data[i][headers.indexOf('room')], building: data[i][headers.indexOf('building')]
      });
    }
  }
  return successResponse(courses);
}

function handleGetAttendanceHistory(e) {
  const userId = e.parameter.user_id;
  if (!userId) return errorResponse('missing_field');
  
  const presenceSheet = getSheet(SHEETS.PRESENCE);
  const presenceData = presenceSheet.getDataRange().getValues();
  if (presenceData.length <= 1) return successResponse({});
  
  const presenceHeaders = presenceData[0];
  const userIdx = presenceHeaders.indexOf('user_id');
  const courseIdx = presenceHeaders.indexOf('course_id');
  const sessionIdx = presenceHeaders.indexOf('session_id');
  const statusIdx = presenceHeaders.indexOf('status');
  const tsIdx = presenceHeaders.indexOf('ts');
  
  const courseHistory = {};
  for (let i = 1; i < presenceData.length; i++) {
    if (String(presenceData[i][userIdx]) === String(userId)) {
      const courseId = presenceData[i][courseIdx];
      const status = presenceData[i][statusIdx];
      const timestamp = presenceData[i][tsIdx] || '';
      const date = timestamp.split('T')[0] || '';
      
      if (!courseHistory[courseId]) {
        const session = findRowByColumn(SHEETS.SESSIONS, 'session_id', presenceData[i][sessionIdx]);
        const courseName = session ? session.rowData[session.headers.indexOf('course_id')] : courseId;
        courseHistory[courseId] = { course_name: courseName, total: 0, present: 0, dates: [] };
      }
      courseHistory[courseId].total++;
      if (status === 'checked_in') courseHistory[courseId].present++;
      courseHistory[courseId].dates.push({ date: date, status: status });
    }
  }
  Object.values(courseHistory).forEach(course => course.dates.sort((a, b) => new Date(a.date) - new Date(b.date)));
  return successResponse(courseHistory);
}
