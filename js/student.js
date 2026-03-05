/**
 * STUDENT DASHBOARD LOGIC - FIX KAMERA BELAKANG
 */

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-scan-btn');
    const stopBtn = document.getElementById('stop-scan-btn');
    const qrReaderContainer = document.getElementById('qr-reader');
    const attendanceStatus = document.getElementById('attendance-status');

    async function startStudentScanner() {
        // Membersihkan container sebelum memulai
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

            // PERUBAHAN DI SINI:
            // Gunakan 'environment' untuk kamera belakang
            await QRScanner.start({ 
                cameraId: 'environment', 
                fps: 10, 
                qrbox: 250 
            });
        }
    }

    async function handleAttendance(qrToken) {
        showLoading(true);
        try {
            const response = await fetch(`${BASE_URL}?path=presence/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: "20230001",
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
            updateStatusUI('error', "Gagal terhubung ke server");
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