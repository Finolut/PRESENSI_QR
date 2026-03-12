/**
 * STUDENT DASHBOARD LOGIC - FIX KAMERA BELAKANG
 */

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-scan-btn');
    const stopBtn = document.getElementById('stop-scan-btn');
    const qrReaderContainer = document.getElementById('qr-reader');
    const attendanceStatus = document.getElementById('attendance-status');

    // -- DEVICE ID & ACCEL INTEGRATION (MODUL 2, 3) --
    let isAccelTracking = false;
    let accelDataBatch = [];
    let accelSimulateInterval = null;
    
    // Inisialisasi Device ID persisten satu kali
    let sessionDeviceId = localStorage.getItem('PRESQR_DEVICE_ID');
    if (!sessionDeviceId) {
        sessionDeviceId = 'DEV-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('PRESQR_DEVICE_ID', sessionDeviceId);
    }
    
    // GAS URL dari Modul 2
    const ACCEL_GAS_URL = "https://script.google.com/macros/s/AKfycbxi9U-Fy-KBNtDDMZkpGCmAPNEpApeJh8q2kHLadbEi313CpOOPWpKHE35cwCJ-UBcS/exec";

async function startStudentScanner() {
    // 1. Bersihkan isi container agar tidak ada sisa elemen video sebelumnya
    qrReaderContainer.innerHTML = ""; 
    
    // 🚀 MULAI ACCELEROMETER SAAT KAMERA DIBUKA
    const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER) || '{}');
    const session_id = (document.getElementById('session-id')?.innerText || 'default_session').trim();
    startAccelTracking(user.user_id?.trim(), session_id);
    
    const isInit = QRScanner.init(
        'qr-reader', 
        async (decodedText) => {
            await handleAttendance(decodedText);
        },
        (error) => {
            console.error("Scan Error:", error);
        }
    );

    if (isInit) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');

        try {
            // 2. Gunakan konfigurasi yang lebih spesifik untuk memaksa kamera belakang
            await QRScanner.start({ 
                // Menggunakan objek cameraId dengan facingMode exact agar browser tidak asal pilih
                cameraId: { exact: "environment" }, 
                fps: 10, 
                qrbox: 250 
            });
        } catch (err) {
            console.warn("Kamera belakang (exact) gagal, mencoba mode standar...");
            // Fallback jika 'exact' tidak didukung (misal di PC/Laptop)
            await QRScanner.start({ 
                cameraId: "environment", 
                fps: 10, 
                qrbox: 250 
            });
        }
    }
}

async function handleAttendance(qrToken) {
    showLoading(true);
    
    try {
        // ✅ Ambil user dari session yang sudah login
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER) || '{}');
        
        // ✅ Ambil course & session dari UI, trim spasi
        const course_id = (document.getElementById('course-id')?.innerText || CONFIG.DEFAULT_COURSE_ID).trim();
        const session_id = (document.getElementById('session-id')?.innerText || CONFIG.DEFAULT_SESSION_ID).trim();
        
        // ✅ Gunakan API wrapper yang sudah benar (dari api.js)
        const result = await API.checkin({
            user_id: user.user_id?.trim(),           // ✅ dari session + trim
            device_id: sessionDeviceId,              // ✅ Gunakan ID unik yang konsisten di modul 1,2,3
            course_id: course_id,
            session_id: session_id,
            qr_token: qrToken.trim(),                // ✅ trim token dari scanner
            ts: new Date().toISOString()
        });

        // ✅ Success UI
        updateStatusUI('success');
        console.log('✅ Checkin success:', result);
        
        // 🛑 BERHENTIKAN ACCELEROMETER SETELAH ABSEN BERHASIL
        console.log('🛑 Absen berhasil, menghentikan pengiriman data Accelerometer...');
        stopAccelTracking();
        
        // 🗺️ KIRIM TITIK KOORDINAT GPS (MODUL 3)
        console.log('🗺️ Mencoba mendapatkan dan mengirim koordinat lokasi GPS...');
        sendGPSLocation(user.user_id?.trim(), sessionDeviceId);
        
    } catch (error) {
        console.error('❌ Checkin error:', error);
        
        // ✅ Tampilkan pesan error yang spesifik
        let msg = CONFIG.MESSAGES.network_error;
        if (error.message?.includes('token_invalid')) msg = '❌ QR code tidak valid';
        else if (error.message?.includes('token_expired')) msg = CONFIG.MESSAGES.token_expired;
        else if (error.message?.includes('session_not_active')) msg = CONFIG.MESSAGES.session_not_active;
        else if (error.message?.includes('already_checked_in')) msg = CONFIG.MESSAGES.checkin_already;
        
        updateStatusUI('error', msg);
    } finally {
        showLoading(false);
        stopStudentScanner();
    }
}

    function stopStudentScanner() {
        QRScanner.stop();
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        
        // Berhentikan accelerometer jika user menekan tombol Berhenti secara manual
        stopAccelTracking();
    }

    function updateStatusUI(state, message = "") {
        if (state === 'success') {
            attendanceStatus.className = "status-badge status-success";
            attendanceStatus.innerHTML = "✅ Presensi Berhasil";
            alert("Presensi Berhasil!");
        } else {
            attendanceStatus.className = "status-badge status-error";
            attendanceStatus.innerHTML = "❌ Gagal: " + message;
            alert("Gagal Presensi: " + message);
        }
    }

    if (startBtn) startBtn.addEventListener('click', startStudentScanner);
    if (stopBtn) stopBtn.addEventListener('click', stopStudentScanner);

    // ==========================================
    // FUNGSI BACKGROUND ACCELEROMETER (MODUL 2)
    // ==========================================

    async function startAccelTracking(userId, sessionId) {
        if (isAccelTracking) return;
        
        // Request Permission
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('devicemotion', (e) => handleOrientation(e, userId, sessionId));
                    isAccelTracking = true;
                } else {
                    console.log('Izin sensor ditolak. Pakai simulasi.');
                    startAccelSimulation(userId, sessionId);
                }
            } catch (error) {
                startAccelSimulation(userId, sessionId);
            }
        } else if ('DeviceMotionEvent' in window) {
            window.addEventListener('devicemotion', (e) => handleOrientation(e, userId, sessionId));
            isAccelTracking = true;
        } else {
            console.log("Accelerometer tidak didukung, pakai simulasi.");
            startAccelSimulation(userId, sessionId);
        }
        
        // Buat indikator visual kecil bahwa background tracking aktif
        const statusBox = document.getElementById('attendance-status-card');
        if (statusBox && !document.getElementById('accel-indicator')) {
            const ind = document.createElement('div');
            ind.id = 'accel-indicator';
            ind.innerHTML = '<span style="font-size:12px; color:#10B981; margin-top:10px; display:block;">📡 Mengirim Telemetri Sensor...</span>';
            statusBox.appendChild(ind);
        }
    }

    function startAccelSimulation(userId, sessionId) {
        isAccelTracking = true;
        accelSimulateInterval = setInterval(() => {
            if (!isAccelTracking) return;
            const x = (Math.random() * 4 - 2).toFixed(2);
            const y = (Math.random() * 4 - 2).toFixed(2);
            const z = (9.8 + Math.random() * 2 - 1).toFixed(2); 
            processAccelData(x, y, z, userId, sessionId);
        }, 200); // 5 titik per detik (Berdasarkan modul 2)
    }

    function handleOrientation(event, userId, sessionId) {
        if (!isAccelTracking) return;
        const x = event.acceleration?.x || event.accelerationIncludingGravity?.x || 0;
        const y = event.acceleration?.y || event.accelerationIncludingGravity?.y || 0;
        const z = event.acceleration?.z || event.accelerationIncludingGravity?.z || 0;
        processAccelData(x, y, z, userId, sessionId);
    }

    function processAccelData(x, y, z, userId, sessionId) {
        const sample = {
            t: new Date().toISOString(),
            x: parseFloat(parseFloat(x).toFixed(2)),
            y: parseFloat(parseFloat(y).toFixed(2)),
            z: parseFloat(parseFloat(z).toFixed(2))
        };
        
        accelDataBatch.push(sample);
        
        // Kirim jika batch mencapai 10
        if (accelDataBatch.length >= 10) {
            sendAccelBatch([...accelDataBatch], userId, sessionId);
            accelDataBatch = [];
        }
    }

    async function sendAccelBatch(samples, userId, sessionId) {
        // Karena Modul 1 dan 2 menggunakan GAS yang sama, parameter tetap mengikuti struktur Modul 2
        const targetUrl = `${ACCEL_GAS_URL}?pathInfo=telemetry/accel`;
        
        const payload = {
            device_id: sessionDeviceId,
            session_id: sessionId,
            user_id: userId,
            ts: new Date().toISOString(),
            samples: samples
        };

        try {
            await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            console.log(`📡 [Background] Terkirim ${samples.length} titik accelerometer`);
        } catch (err) {
            console.error('Background Accel Error:', err);
        }
    }

    function stopAccelTracking() {
        if (!isAccelTracking) return;
        isAccelTracking = false;
        
        if (accelSimulateInterval) {
            clearInterval(accelSimulateInterval);
            accelSimulateInterval = null;
        }
        
        // Kirim sisa data jika ada
        if (accelDataBatch.length > 0) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER) || '{}');
            const session_id = (document.getElementById('session-id')?.innerText || 'default_session').trim();
            sendAccelBatch([...accelDataBatch], user.user_id?.trim(), session_id);
            accelDataBatch = [];
        }
        
        const ind = document.getElementById('accel-indicator');
        if (ind) ind.remove();
        console.log('🛑 Sensor accelerometer dihentikan.');
    }

    // ==========================================
    // FUNGSI LOKASI GPS (MODUL 3 INTEGRASI)
    // ==========================================
    
    function sendGPSLocation(userId, deviceId) {
        if (!navigator.geolocation) {
            console.warn('Geolocation tidak didukung di browser ini.');
            return;
        }

        // Indikator UI
        const statusBox = document.getElementById('attendance-status-card');
        let gpsInd = document.getElementById('gps-indicator');
        if (statusBox && !gpsInd) {
            gpsInd = document.createElement('div');
            gpsInd.id = 'gps-indicator';
            gpsInd.innerHTML = '<span style="font-size:12px; color:#F59E0B; margin-top:5px; display:block;">🗺️ Menentukan Lokasi Peta...</span>';
            statusBox.appendChild(gpsInd);
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const acc = position.coords.accuracy;

                const targetUrl = `${ACCEL_GAS_URL}?pathInfo=telemetry/gps`;
                const payload = {
                    device_id: deviceId, // Gunakan deviceId session yang sama dengan accelerometer
                    ts: new Date().toISOString(),
                    lat: parseFloat(lat.toFixed(5)),
                    lng: parseFloat(lng.toFixed(5)),
                    accuracy_m: Math.round(acc)
                };

                try {
                    await fetch(targetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    });
                    console.log(`🗺️ [GPS] Berhasil merekam koordinat di map: Lat ${payload.lat}, Lng ${payload.lng}`);
                    if(gpsInd) gpsInd.innerHTML = '<span style="font-size:12px; color:#10B981; margin-top:5px; display:block;">📍 Lokasi Presensi Terkunci!</span>';
                } catch (err) {
                    console.error('Koneksi GPS ke server Error:', err);
                    if(gpsInd) gpsInd.remove();
                }
            },
            (error) => {
                console.warn('Gagal membaca lokasi GPS:', error.message);
                if(gpsInd) gpsInd.innerHTML = '<span style="font-size:12px; color:#EF4444; margin-top:5px; display:block;">⚠️ Gagal (Timeout/GPS Error). Coba cari sinyal lapang.</span>';
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
        );
    }

});

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}