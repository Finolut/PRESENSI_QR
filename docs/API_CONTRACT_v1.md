# API Contract Simple v1 - Presensi QR

## Base URL
`https://script.google.com/macros/s/AKfycbwV1hCkS1Wm65TvorJqXOGBJlgTAGkJV1aN4QuXltiBvKDpR05sv0ZwADjf6w17ETxB/exec`

## Format Data
- Request/Response: JSON
- Timestamp: ISO-8601 (`2026-03-03T10:15:30Z`)

## Endpoints

### Auth
- `POST /auth/register` - Register user
- `POST /auth/login` - Login & dapat token

### Presence
- `POST /presence/session/create` - Buat sesi (dosen)
- `POST /presence/qr/generate` - Generate QR token
- `POST /presence/checkin` - Mahasiswa check-in
- `GET /presence/status` - Cek status presensi
- `GET /presence/list` - List mahasiswa + status (dosen)
- `POST /presence/session/close` - Tutup sesi

## Response Format
Sukses: `{"ok": true, "data": {...}}`
Error: `{"ok": false, "error": "error_code"}`