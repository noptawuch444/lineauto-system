import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n' + '='.repeat(70));
console.log('🧪 LINE Message Test Tool');
console.log('='.repeat(70));
console.log('\nนี่คือเครื่องมือทดสอบส่งข้อความ LINE');
console.log('คุณสามารถลองส่งข้อความไปยัง User ID ต่างๆ เพื่อหาว่า ID ไหนถูกต้อง\n');

function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function sendTestMessage() {
    try {
        console.log('\n📝 กรอกข้อมูลเพื่อทดสอบส่งข้อความ:\n');

        const userId = await askQuestion('User ID (หรือกด Enter เพื่อใช้ค่าเริ่มต้น): ');
        const message = await askQuestion('ข้อความที่ต้องการส่ง (หรือกด Enter เพื่อใช้ "ทดสอบระบบ"): ');

        const targetUserId = userId.trim() || 'U26b5646daebb838fd464aa3b4428c2f6';
        const textMessage = message.trim() || 'ทดสอบระบบ LINE Auto 🎉';

        console.log('\n⏳ กำลังส่งข้อความ...');
        console.log(`   User ID: ${targetUserId}`);
        console.log(`   ข้อความ: ${textMessage}\n`);

        await client.pushMessage(targetUserId, {
            type: 'text',
            text: textMessage
        });

        console.log('✅ ส่งข้อความสำเร็จ!');
        console.log('📱 ตรวจสอบ LINE app ของคุณ\n');

    } catch (error: any) {
        console.log('\n❌ เกิดข้อผิดพลาด:');
        console.log('   ' + error.message);

        if (error.message.includes('Invalid reply token')) {
            console.log('\n💡 คำแนะนำ: ใช้ Push Message API แทน Reply API');
        } else if (error.message.includes('Not found')) {
            console.log('\n💡 คำแนะนำ: User ID ไม่ถูกต้องหรือยังไม่ได้เพิ่มเพื่อน Bot');
            console.log('   1. Scan QR Code เพื่อเพิ่มเพื่อน Bot');
            console.log('   2. ใช้ User ID จาก Messaging API Channel (ไม่ใช่ LINE Login)');
        } else if (error.message.includes('Invalid access token')) {
            console.log('\n💡 คำแนะนำ: Channel Access Token ไม่ถูกต้อง');
            console.log('   ตรวจสอบไฟล์ .env ว่าใส่ Token ถูกต้องหรือไม่');
        }
        console.log('');
    }

    const again = await askQuestion('ต้องการทดสอบอีกครั้งหรือไม่? (y/n): ');
    if (again.toLowerCase() === 'y' || again.toLowerCase() === 'yes') {
        await sendTestMessage();
    } else {
        console.log('\n👋 ขอบคุณที่ใช้งาน!\n');
        rl.close();
        process.exit(0);
    }
}

// เริ่มต้นโปรแกรม
console.log('📋 User IDs ที่คุณมี:');
console.log('   1. U902731df21b9335dc973bd95de6ba60f (จาก LINE Login)');
console.log('   2. U26b5646daebb838fd464aa3b4428c2f6 (จาก LINE Login)');
console.log('\n⚠️  User ID เหล่านี้อาจใช้ไม่ได้เพราะมาจาก LINE Login Channel');
console.log('   ต้องใช้ User ID จาก Messaging API Channel แทน\n');

sendTestMessage();
