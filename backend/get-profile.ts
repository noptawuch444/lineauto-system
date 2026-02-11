import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

async function testConnection() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ทดสอบการเชื่อมต่อ LINE Messaging API');
    console.log('='.repeat(70));

    // ทดสอบ User IDs ที่มี
    const userIds = [
        'U902731df21b9335dc973bd95de6ba60f',
        'U26b5646daebb838fd464aa3b4428c2f6'
    ];

    console.log('\n📋 กำลังทดสอบ User IDs ทั้งหมด...\n');

    for (const userId of userIds) {
        try {
            console.log(`\n🔍 ทดสอบ User ID: ${userId}`);

            // ลองดึงโปรไฟล์
            const profile = await client.getProfile(userId);

            console.log('✅ พบผู้ใช้!');
            console.log(`   ชื่อ: ${profile.displayName}`);
            console.log(`   User ID: ${profile.userId}`);
            console.log(`   รูปโปรไฟล์: ${profile.pictureUrl || 'ไม่มี'}`);
            console.log(`   สถานะ: ${profile.statusMessage || 'ไม่มี'}`);

            // ลองส่งข้อความทดสอบ
            console.log('\n📤 กำลังส่งข้อความทดสอบ...');
            await client.pushMessage(userId, {
                type: 'text',
                text: '✅ ระบบ LINE Auto เชื่อมต่อสำเร็จ!\n\nคุณสามารถใช้งานระบบตั้งเวลาส่งข้อความได้แล้ว 🎉'
            });

            console.log('✅ ส่งข้อความสำเร็จ!');
            console.log('\n' + '='.repeat(70));
            console.log('🎉 ระบบเชื่อมต่อสำเร็จ!');
            console.log('='.repeat(70));
            console.log(`\n✅ User ID ที่ใช้งานได้: ${userId}`);
            console.log('\n📱 ตรวจสอบ LINE app ของคุณ - คุณควรได้รับข้อความทดสอบ!');
            console.log('\n🚀 ขั้นตอนถัดไป:');
            console.log('   1. เปิด http://localhost:5173');
            console.log(`   2. ใส่ User ID: ${userId}`);
            console.log('   3. ตั้งเวลาและส่งข้อความได้เลย!\n');

            process.exit(0);

        } catch (error: any) {
            console.log('❌ ไม่สามารถใช้งาน User ID นี้ได้');
            console.log(`   เหตุผล: ${error.message}`);

            if (error.message.includes('Not found')) {
                console.log('   💡 User ID นี้ไม่ได้เพิ่มเพื่อน Bot หรือมาจาก Channel อื่น');
            }
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('❌ ไม่พบ User ID ที่ใช้งานได้');
    console.log('='.repeat(70));
    console.log('\n💡 วิธีแก้ปัญหา:');
    console.log('\n1️⃣ เพิ่มเพื่อน Bot:');
    console.log('   - ไปที่ https://developers.line.biz/console/');
    console.log('   - เลือก Messaging API Channel (ID: 2009047115)');
    console.log('   - แท็บ "Messaging API" → Scan QR Code');
    console.log('\n2️⃣ หา User ID ที่ถูกต้อง:');
    console.log('   - User ID ต้องมาจาก Messaging API Channel');
    console.log('   - ไม่ใช่จาก LINE Login Channel');
    console.log('\n3️⃣ วิธีหา User ID (เลือก 1 วิธี):');
    console.log('   A. ใช้ LINE Official Account Manager:');
    console.log('      → https://manager.line.biz/ → Chats');
    console.log('   B. ตั้งค่า Webhook (ต้องใช้ ngrok):');
    console.log('      → รัน: npx tsx find-userid.ts');
    console.log('      → ตั้งค่า webhook ตามคำแนะนำ\n');
}

testConnection();
