const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory data store for accelerometer data
let accelerometerData = [];

// Endpoint to receive batch accelerometer data (POST)
app.post('/telemetry/accel', (req, res) => {
    const data = req.body;
    
    if (Array.isArray(data)) {
        // If it's a batch of data
        accelerometerData = accelerometerData.concat(data);
    } else {
        // If it's a single data point
        accelerometerData.push(data);
    }

    // Keep only the last 1000 records to prevent memory issues
    if (accelerometerData.length > 1000) {
        accelerometerData = accelerometerData.slice(accelerometerData.length - 1000);
    }

    console.log(`Received accelerometer data: ${typeof data.length !== 'undefined' ? data.length + ' items' : '1 item'}`);
    res.status(200).json({ message: 'Data berhasil dikirim', count: Array.isArray(data) ? data.length : 1 });
});

// Endpoint to get the latest accelerometer data (GET)
app.get('/telemetry/accel/latest', (req, res) => {
    if (accelerometerData.length === 0) {
        return res.status(404).json({ message: 'Belum ada data' });
    }
    
    // Get the latest data point
    const latestData = accelerometerData[accelerometerData.length - 1];
    res.status(200).json(latestData);
});

// Endpoint to get all data (optional, for debugging)
app.get('/telemetry/accel', (req, res) => {
    res.status(200).json(accelerometerData);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Endpoints:');
    console.log(`  POST /telemetry/accel        -> kirim batch sensor`);
    console.log(`  GET  /telemetry/accel/latest -> ambil data terbaru`);
});
