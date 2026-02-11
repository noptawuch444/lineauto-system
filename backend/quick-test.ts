import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

const userId = 'U26b5646daebb838fd464aa3b4428c2f6';
const message = 'ทดสอบระบบ - ตรวจสอบ error';

console.log('\n' + '='.repeat(70));
console.log('🧪 ทดสอบส่งข้อความด้วย detailed logging');
console.log('='.repeat(70));
console.log('\n📋 ข้อมูล:');
console.log('   User ID:', userId);
console.log('   Message:', message);
console.log('   Token:', process.env.LINE_CHANNEL_ACCESS_TOKEN?.substring(0, 20) + '...');
console.log('   Secret:', process.env.LINE_CHANNEL_SECRET);

async function test() {
    try {
        console.log('\n📤 กำลังส่งข้อความ...\n');

        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        console.log('\n✅ ส่งสำเร็จ!');
        console.log('📱 ตรวจสอบ LINE app ของคุณ\n');

    } catch (error: any) {
        console.log('\n❌ เกิดข้อผิดพลาด:');
        console.log('   Error name:', error.name);
        console.log('   Error message:', error.message);
        console.log('   Error code:', error.code);
        console.log('   Status code:', error.statusCode);
        console.log('   Original error:', error.originalError);

        if (error.response) {
            console.log('\n📄 Response data:');
            console.log(JSON.stringify(error.response.data, null, 2));
        }

        console.log('\n🔍 Full error object:');
        console.log(JSON.stringify(error, null, 2));
        console.log('');
    }
}

test();
