const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🚀 Triggering API Request to generate logs...');
    try {
        // Updated URL to matching the new route prefix
        const response = await axios.get('http://localhost:3000/api/public-template/template/gztbtdur/messages');
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Data Length:', response.data.length);
        console.log('✅ Response Data Preview:', JSON.stringify(response.data).substring(0, 100));
    } catch (error: any) {
        console.error('❌ Request Failed:', error.message);
        if (error.response) {
            console.error('❌ Response Status:', error.response.status);
            console.error('❌ Response Data:', error.response.data);
        }
    }

    // Read the log file
    const logPath = path.join(__dirname, '../debug_output.txt');
    console.log('\n📄 Reading debug_output.txt:');
    if (fs.existsSync(logPath)) {
        console.log(fs.readFileSync(logPath, 'utf8'));
    } else {
        console.log('⚠️ debug_output.txt not found yet.');
    }
}

main();
