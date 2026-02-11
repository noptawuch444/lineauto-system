# LINE Auto Messaging System

ระบบตั้งเวลาส่งข้อความอัตโนมัติผ่าน LINE Messaging API พร้อม Admin Interface สำหรับจัดการข้อความ

## 🏗 สถาปัตยกรรมระบบ

```
[ React Admin Interface ]
         ↓
   [ Backend API ]
         ↓
  [ Scheduler/Cron ]
         ↓
[ LINE Messaging API ]
         ↓
  [ ลูกค้าใน LINE ]
```

## ✨ ฟีเจอร์หลัก

### Admin Interface (React)
- 📅 ตั้งเวลาส่งข้อความ (วัน/เวลา)
- ✏️ พิมพ์ข้อความ
- 🖼 อัปโหลดรูปภาพ
- 👥 เลือกกลุ่มเป้าหมาย (User/Group/Room)
- 📋 ดูรายการข้อความที่ตั้งเวลา
- ✅ แก้ไข/ยกเลิกข้อความ

### Backend API (Node.js + Express)
- RESTful API สำหรับจัดการข้อความ
- อัปโหลดและจัดเก็บรูปภาพ
- บันทึกข้อมูลใน SQLite Database
- ส่งข้อความผ่าน LINE Messaging API

### Scheduler (Cron)
- ตรวจสอบข้อความที่ถึงเวลาส่งทุก 1 นาที
- ส่งข้อความอัตโนมัติตามเวลาที่กำหนด
- บันทึก Log การส่งข้อความ

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดเบื้องต้น
- Node.js 18+ 
- npm หรือ yarn
- LINE Messaging API Channel (ดูวิธีสร้างด้านล่าง)

### 1. ติดตั้ง Backend

```bash
cd backend
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน folder `backend`:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL="file:./dev.db"

# LINE Messaging API Credentials
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### 3. สร้าง Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 4. รัน Backend Server

```bash
cd backend
npm run dev
```

Backend จะรันที่ `http://localhost:3000`

### 5. ติดตั้ง Frontend

เปิด Terminal ใหม่:

```bash
cd frontend
npm install
```

### 6. รัน Frontend

```bash
cd frontend
npm run dev
```

Frontend จะรันที่ `http://localhost:5173`

## 🔑 การตั้งค่า LINE Messaging API

### 1. สร้าง LINE Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider ใหม่ (ถ้ายังไม่มี)
3. สร้าง Messaging API Channel
4. ในหน้า Channel Settings:
   - คัดลอก **Channel Secret**
   - ไปที่แท็บ "Messaging API"
   - คัดลอก **Channel Access Token** (ถ้ายังไม่มีให้กด Issue)

### 2. ตั้งค่า Channel

- **Webhook URL**: ปิดการใช้งาน (ไม่จำเป็นสำหรับระบบนี้)
- **Allow bot to join group chats**: เปิด (ถ้าต้องการส่งข้อความในกลุ่ม)

### 3. หา User ID / Group ID

**วิธีหา User ID:**
1. เพิ่มเพื่อน LINE Official Account ที่สร้าง
2. ใช้ [LINE Bot Designer](https://developers.line.biz/console/) หรือ
3. ใช้ Webhook เพื่อดู User ID จาก Event

**วิธีหา Group ID:**
1. เชิญ Bot เข้ากลุ่ม
2. ใช้ Webhook เพื่อดู Group ID จาก Event

## 📚 API Documentation

### Endpoints

#### `GET /api/messages`
ดึงรายการข้อความทั้งหมด

#### `GET /api/messages/:id`
ดึงข้อมูลข้อความตาม ID

#### `POST /api/messages`
สร้างข้อความใหม่

**Request Body:**
```json
{
  "content": "สวัสดีครับ",
  "imageUrl": "/uploads/image.jpg",
  "scheduledTime": "2026-02-04T15:00:00.000Z",
  "targetType": "user",
  "targetIds": ["U1234567890abcdef"]
}
```

#### `PUT /api/messages/:id`
แก้ไขข้อความ (เฉพาะสถานะ pending)

#### `DELETE /api/messages/:id`
ยกเลิกข้อความ (เปลี่ยนสถานะเป็น cancelled)

#### `POST /api/messages/upload`
อัปโหลดรูปภาพ

**Request:** `multipart/form-data` with `image` field

## 🗄 Database Schema

### ScheduledMessage
- `id`: UUID
- `content`: ข้อความ
- `imageUrl`: URL รูปภาพ (optional)
- `scheduledTime`: เวลาที่ต้องการส่ง
- `status`: pending | sent | failed | cancelled
- `targetType`: user | group | room
- `targetIds`: JSON array ของ Target IDs
- `createdAt`: วันที่สร้าง
- `updatedAt`: วันที่แก้ไข

### MessageLog
- `id`: UUID
- `messageId`: FK to ScheduledMessage
- `sentAt`: เวลาที่ส่ง
- `status`: success | failed
- `error`: ข้อความ error (ถ้ามี)

## 🎨 Tech Stack

### Backend
- **Node.js** + **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM
- **SQLite** - Database
- **node-cron** - Scheduler
- **@line/bot-sdk** - LINE Messaging API
- **Multer** - File upload

### Frontend
- **React** + **TypeScript** - UI framework
- **Vite** - Build tool
- **Axios** - HTTP client
- **react-datepicker** - Date/time picker
- **date-fns** - Date formatting

## 🔧 การพัฒนาต่อ

### เพิ่มฟีเจอร์แก้ไขข้อความ
ปัจจุบันปุ่มแก้ไขยังไม่ได้ implement เต็มรูปแบบ สามารถพัฒนาต่อได้โดย:
1. สร้าง Modal หรือ Form สำหรับแก้ไข
2. เรียก API `PUT /api/messages/:id`
3. Refresh รายการข้อความ

### เพิ่มการแจ้งเตือน
- ใช้ WebSocket หรือ Server-Sent Events สำหรับ real-time updates
- แจ้งเตือนเมื่อข้อความถูกส่งสำเร็จหรือล้มเหลว

### Deploy Production
- ใช้ PostgreSQL แทน SQLite
- ตั้งค่า Environment Variables บน Server
- ใช้ PM2 สำหรับรัน Node.js
- Deploy Frontend บน Vercel/Netlify
- ตั้งค่า HTTPS

## 📝 License

MIT

## 🤝 Contributing

Pull requests are welcome!

---

Made with ❤️ for LINE Auto Messaging
