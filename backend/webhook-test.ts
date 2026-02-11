import express from 'express';
import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);

// Simple endpoint to get your user ID
app.get('/get-user-id', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Get Your LINE User ID</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #06c755; }
        .step {
          background: #f9f9f9;
          padding: 15px;
          margin: 15px 0;
          border-left: 4px solid #06c755;
        }
        code {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 วิธีหา LINE User ID</h1>
        
        <div class="warning">
          <strong>⚠️ สำคัญ:</strong> Webhook server นี้รันอยู่แล้ว แต่ต้องตั้งค่า Webhook URL ใน LINE Console ก่อน
        </div>

        <div class="step">
          <h3>ขั้นตอนที่ 1: เพิ่มเพื่อน Bot</h3>
          <p>1. ไปที่ <a href="https://developers.line.biz/console/" target="_blank">LINE Developers Console</a></p>
          <p>2. เลือก Channel ของคุณ (Channel ID: 2009047115)</p>
          <p>3. ไปที่แท็บ "Messaging API"</p>
          <p>4. Scan QR Code เพื่อเพิ่มเพื่อน Bot</p>
        </div>

        <div class="step">
          <h3>ขั้นตอนที่ 2: ส่งข้อความหา Bot</h3>
          <p>เปิด LINE app และส่งข้อความ "test" หา Bot</p>
        </div>

        <div class="step">
          <h3>ขั้นตอนที่ 3: ดู User ID</h3>
          <p>User ID จะแสดงใน Terminal ที่รัน webhook-test.ts</p>
          <p>หรือดูที่ <code>http://localhost:3001/logs</code></p>
        </div>

        <hr>

        <h2>🚀 วิธีเร็วสุด: ใช้ User ID จาก Basic Settings</h2>
        <div class="step">
          <p>1. ไปที่ LINE Developers Console → Basic settings</p>
          <p>2. หา "Your user ID" ด้านล่างสุด</p>
          <p>3. คัดลอก User ID นั้นไปใช้ทดสอบได้เลย!</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Store received user IDs
const receivedUserIds: string[] = [];

app.post('/webhook', express.json(), (req, res) => {
    const events = req.body.events || [];

    events.forEach((event: any) => {
        if (event.source && event.source.userId) {
            const userId = event.source.userId;
            if (!receivedUserIds.includes(userId)) {
                receivedUserIds.push(userId);
            }

            console.log('\n' + '='.repeat(60));
            console.log('📨 New Message Received!');
            console.log('='.repeat(60));
            console.log('👤 USER ID:', userId);
            console.log('   ⬆️ Copy this User ID!');
            console.log('='.repeat(60) + '\n');
        }
    });

    res.sendStatus(200);
});

// View all received user IDs
app.get('/logs', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Received User IDs</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #06c755; }
        .user-id {
          background: #f0f0f0;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          font-family: monospace;
          font-size: 16px;
        }
        .copy-btn {
          background: #06c755;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          margin-left: 10px;
        }
        .copy-btn:hover {
          background: #05b04b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📋 Received User IDs</h1>
        ${receivedUserIds.length === 0
            ? '<p>ยังไม่มี User ID ที่ได้รับ กรุณาส่งข้อความหา Bot ก่อน</p>'
            : receivedUserIds.map(id => `
              <div class="user-id">
                ${id}
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${id}')">Copy</button>
              </div>
            `).join('')
        }
        <p><a href="/get-user-id">← กลับไปดูวิธีการ</a></p>
      </div>
    </body>
    </html>
  `);
});

app.get('/', (req, res) => {
    res.redirect('/get-user-id');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log('🚀 Webhook server running on http://localhost:3001');
    console.log('📖 View instructions: http://localhost:3001/get-user-id');
    console.log('📋 View received User IDs: http://localhost:3001/logs');
});
