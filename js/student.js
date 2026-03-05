/**
 * STUDENT DASHBOARD LOGIC - VANILLA JS
 */

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-scan-btn');
    const stopBtn = document.getElementById('stop-scan-btn');
    const qrReaderContainer = document.getElementById('qr-reader');
    const attendanceStatus = document.getElementById('attendance-status');

    // 1. Fungsi untuk memulai Scan (Kamera Depan)
    async function startStudentScanner() {
        // Reset tampilan container
        qrReaderContainer.innerHTML = ""; 
        
        // Inisialisasi menggunakan modul QRScanner di qr-scanner.js
        const isInit = QRScanner.init(
            'qr-reader', 
            async (decodedText) => {
                // Jika sukses scan
                await handleAttendance(decodedText);
            },
            (error) => {
                console.error("Scan Error:", error);
            }
        );

        if (isInit) {
            // Sembunyikan tombol Start, munculkan tombol Stop
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');

            // PAKSA KAMERA DEPAN menggunakan facingMode: 'user'
            await QRScanner.start({ 
                cameraId: 'user', 
                fps: 10, 
                qrbox: 250 
            });
        }
    }

    // 2. Fungsi Kirim Data ke API
    async function handleAttendance(qrToken) {
        showLoading(true);
        try {
            // Gunakan BASE_URL dari api.js/config.js
            const response = await fetch(`${BASE_URL}?path=presence/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: "20230001", // Sesuaikan dengan data login
                    device_id: "dev-001",
                    course_id: document.getElementById('course-id').innerText || "cloud-101",
                    session_id: document.getElementById('session-id').innerText || "sesi-02",
                    qr_token: qrToken,
                    ts: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (data.ok) {
                updateStatusUI('success');
            } else {
                updateStatusUI('error', data.message);
            }
        } catch (error) {
            console.error("API Error:", error);
            updateStatusUI('error', "Gagal terhubung ke server");
        } finally {
            showLoading(false);
            stopStudentScanner();
        }
    }

    // 3. Fungsi Stop Scan
    function stopStudentScanner() {
        QRScanner.stop();
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }

    // 4. Update UI Status
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

    // Event Listeners
    if (startBtn) startBtn.addEventListener('click', startStudentScanner);
    if (stopBtn) stopBtn.addEventListener('click', stopStudentScanner);
});

// Helper Loading (Pastikan fungsi ini ada atau buat sederhana)
function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}