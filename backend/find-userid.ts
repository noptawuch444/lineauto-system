import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Store received user IDs
const receivedMessages: any[] = [];

app.post('/webhook', (req, res) => {
    const events = req.body.events || [];

    console.log('\n' + '='.repeat(70));
    console.log('📨 WEBHOOK RECEIVED!');
    console.log('='.repeat(70));

    events.forEach((event: any) => {
        receivedMessages.push({
            timestamp: new Date().toISOString(),
            event: event
        });

        console.log('Event Type:', event.type);

        if (event.source) {
            if (event.source.userId) {
                console.log('\n🎯 USER ID:', event.source.userId);
                console.log('   👆 COPY THIS USER ID!\n');
            }
            if (event.source.groupId) {
                console.log('\n👥 GROUP ID:', event.source.groupId);
            }
        }

        if (event.type === 'message' && event.message.type === 'text') {
            console.log('💬 Message:', event.message.text);
        }
    });

    console.log('='.repeat(70) + '\n');
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LINE Webhook - User ID Finder</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #06c755;
          margin-bottom: 10px;
          font-size: 2.5em;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 1.1em;
        }
        .step {
          background: #f8f9fa;
          padding: 25px;
          margin: 20px 0;
          border-radius: 12px;
          border-left: 5px solid #06c755;
        }
        .step h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 1.3em;
        }
        .step p {
          color: #555;
          line-height: 1.8;
          margin: 8px 0;
        }
        .step ol {
          margin-left: 20px;
          color: #555;
          line-height: 1.8;
        }
        .user-id-box {
          background: #e8f5e9;
          border: 2px solid #06c755;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          font-size: 1.2em;
          word-break: break-all;
        }
        .warning {
          background: #fff3cd;
          border-left: 5px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .success {
          background: #d4edda;
          border-left: 5px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .error {
          background: #f8d7da;
          border-left: 5px solid #dc3545;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        code {
          background: #f4f4f4;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .btn {
          display: inline-block;
          background: #06c755;
          color: white;
          padding: 12px 30px;
          border-radius: 8px;
          text-decoration: none;
          margin: 10px 5px;
          transition: all 0.3s;
        }
        .btn:hover {
          background: #05b04b;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(6,199,85,0.3);
        }
        .refresh-btn {
          background: #007bff;
        }
        .refresh-btn:hover {
          background: #0056b3;
        }
      </style>
      <script>
        function autoRefresh() {
          setTimeout(() => location.reload(), 5000);
        }
      </script>
    </head>
    <body>
      <div class="container">
        <h1>🎯 LINE User ID Finder</h1>
        <p class="subtitle">หา User ID จาก Messaging API Channel</p>

        ${receivedMessages.length === 0 ? `
          <div class="warning">
            <strong>⚠️ ยังไม่มีข้อความเข้ามา</strong>
            <p>กรุณาทำตามขั้นตอนด้านล่างเพื่อหา User ID</p>
          </div>

          <div class="step">
            <h3>📱 ขั้นตอนที่ 1: เพิ่มเพื่อน Bot</h3>
            <ol>
              <li>ไปที่ <a href="https://developers.line.biz/console/" target="_blank">LINE Developers Console</a></li>
              <li>เลือก <strong>Messaging API Channel</strong> (Channel ID: 2009047115)</li>
              <li>ไปที่แท็บ <strong>"Messaging API"</strong></li>
              <li>Scroll ลงไปหา <strong>QR Code</strong></li>
              <li>เปิด LINE app บนมือถือและ <strong>Scan QR Code</strong></li>
            </ol>
          </div>

          <div class="step">
            <h3>🔧 ขั้นตอนที่ 2: ตั้งค่า Webhook URL</h3>
            <ol>
              <li>ใน Messaging API tab เดิม หาส่วน <strong>"Webhook settings"</strong></li>
              <li>คุณต้องใช้ <strong>ngrok</strong> เพื่อ expose localhost:
                <ul style="margin-top: 10px;">
                  <li>ติดตั้ง: <code>npm install -g ngrok</code></li>
                  <li>สมัคร account ที่ <a href="https://ngrok.com" target="_blank">ngrok.com</a></li>
                  <li>รัน: <code>ngrok http 3002</code></li>
                  <li>คัดลอก HTTPS URL ที่ได้</li>
                </ul>
              </li>
              <li>ใส่ Webhook URL: <code>https://YOUR_NGROK_URL/webhook</code></li>
              <li>เปิด <strong>"Use webhook"</strong> (toggle เป็นสีเขียว)</li>
              <li>คลิก <strong>"Verify"</strong></li>
            </ol>
          </div>

          <div class="step">
            <h3>💬 ขั้นตอนที่ 3: ส่งข้อความหา Bot</h3>
            <ol>
              <li>เปิด LINE app</li>
              <li>ส่งข้อความ <strong>"test"</strong> หา Bot</li>
              <li>Refresh หน้านี้เพื่อดู User ID</li>
            </ol>
          </div>

          <a href="/" class="btn refresh-btn" onclick="autoRefresh()">🔄 Auto Refresh (5s)</a>
        ` : `
          <div class="success">
            <strong>✅ พบ User ID แล้ว!</strong>
          </div>

          ${receivedMessages.map((msg, idx) => {
        const userId = msg.event.source?.userId;
        return userId ? `
              <div class="user-id-box">
                <strong>User ID #${idx + 1}:</strong><br>
                ${userId}
              </div>
            ` : '';
    }).join('')}

          <div class="step">
            <h3>🚀 ขั้นตอนถัดไป:</h3>
            <ol>
              <li><strong>คัดลอก User ID</strong> ด้านบน</li>
              <li>ไปที่ <a href="http://localhost:5173" target="_blank">http://localhost:5173</a></li>
              <li>ใส่ User ID ในช่อง <strong>"Target ID"</strong></li>
              <li>ตั้งเวลาและส่งข้อความทดสอบ!</li>
            </ol>
          </div>
        `}

        <hr style="margin: 30px 0; border: none; border-top: 2px solid #eee;">
        
        <div class="error">
          <strong>❌ ทำไมถึง Failed to send?</strong>
          <p>เพราะ User ID <code>U26b5646daebb838fd464aa3b4428c2f6</code> มาจาก <strong>LINE Login Channel</strong> ไม่ใช่ <strong>Messaging API Channel</strong></p>
          <p>แต่ละ Channel จะมี User ID ต่างกัน ต้องใช้ User ID จาก Messaging API Channel เท่านั้น!</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 Webhook Server Started!');
    console.log('='.repeat(70));
    console.log(`📖 Open browser: http://localhost:${PORT}`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log('');
    console.log('⚠️  You need ngrok to expose this server:');
    console.log('   1. Install: npm install -g ngrok');
    console.log('   2. Sign up: https://ngrok.com');
    console.log('   3. Run: ngrok http 3002');
    console.log('   4. Set webhook URL in LINE Console');
    console.log('='.repeat(70) + '\n');
});
