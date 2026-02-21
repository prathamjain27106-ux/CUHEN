const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
// body-parser is no longer needed – we use express.raw

// Load environment variables
dotenv.config();

// Import routes
const violationRoutes = require('./routes1/violation2');

// Initialize Express app
const app = express();

// ===== 1. CORS – allow your frontend origin =====
app.use(cors({
    origin: 'http://localhost:3006', // your frontend dev server
    credentials: true
}));

// ===== 2. Static file serving =====
// Serve files from 'uploads1' folder under the URL path '/uploads1'
// (Changed from '/uploads' to '/uploads1' to match your intended usage)
app.use('/uploads1', express.static(path.join(__dirname, 'uploads1')));

// ===== 3. Body parsers =====
// For JSON and URL-encoded data (other endpoints)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// For raw JPEG uploads – apply only to POST /api/violations
app.use('/api/violations', (req, res, next) => {
    if (req.method === 'POST') {
        console.log('⚙️ Raw body-parser middleware: POST request detected');
        // Use express.raw (built-in) instead of body-parser
        express.raw({ type: 'image/jpeg', limit: '10mb' })(req, res, (err) => {
            if (err) {
                console.error('❌ express.raw error:', err);
                return next(err);
            }
            console.log(`✅ express.raw finished. req.body type: ${typeof req.body}, length: ${req.body ? req.body.length : 'undefined'}`);
            next();
        });
    } else {
        next();
    }
});

// ===== 4. Mount API routes =====
app.use('/api/violations', violationRoutes);

// ===== 5. Root route (API info) =====
app.get('/', (req, res) => {
    res.json({
        message: 'ESP32-CAM Violation Detection API',
        status: 'running',
        endpoints: {
            'POST /api/violations': 'Upload violation (image + sensor data)',
            'GET /api/violations': 'Get all violations (paginated)',
            'GET /api/violations/:id': 'Get specific violation',
            'GET /api/violations/recent': 'Get recent violations',
            'GET /api/violations/type/:type': 'Get by type (smoke/spit)',
            'DELETE /api/violations/:id': 'Delete violation'
        }
    });
});

// ===== 6. MongoDB Connection with retry logic =====
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/esp32_cam_db', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ MongoDB Connection error:', error);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});
mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// ===== 7. Error handling middleware (must be last) =====
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// ===== 8. Start server =====
const PORT = process.env.PORT || 5005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on:`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Network: http://${getLocalIP()}:${PORT}`);
});

// Helper function to get local IP address
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}