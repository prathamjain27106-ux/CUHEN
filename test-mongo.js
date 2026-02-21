const mongoose = require('mongoose');

async function test() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/esp32_cam_db');
        console.log('✅ Connected to MongoDB');
        const Violation = require('./models1/violation');
        const docs = await Violation.find();
        console.log('✅ Query successful, documents:', docs);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}
test();