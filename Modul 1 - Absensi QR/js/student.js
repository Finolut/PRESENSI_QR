/**
 * STUDENT DASHBOARD LOGIC - FIX KAMERA BELAKANG
 */

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-scan-btn');
    const stopBtn = document.getElementById('stop-scan-btn');
    const qrReaderContainer = document.getElementById('qr-reader');
    const attendanceStatus = document.getElementById('attendance-status');

async function startStudentScanner() {
    // 1. Bersihkan isi container agar tidak ada sisa elemen video sebelumnya
    qrReaderContainer.innerHTML = ""; 
    
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
            device_id: (navigator.userAgent || 'web-client').trim(),
            course_id: course_id,
            session_id: session_id,
            qr_token: qrToken.trim(),                // ✅ trim token dari scanner
            ts: new Date().toISOString()
        });

        // ✅ Success UI
        updateStatusUI('success');
        console.log('✅ Checkin success:', result);
        
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
});

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}