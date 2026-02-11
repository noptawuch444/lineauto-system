
import axios from 'axios';

async function testCreateMessage() {
    try {
        console.log('Sending test message to backend...');
        const response = await axios.post('http://localhost:3000/api/messages', {
            content: 'Test Multiple Images via Script',
            scheduledTime: new Date(Date.now() + 60000).toISOString(), // 1 min from now
            targetType: 'user',
            targetIds: ['U1234567890'],
            imageUrls: [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg'
            ]
        });

        console.log('✅ Response:', response.status);
        console.log('📦 Created Message:', response.data);
    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testCreateMessage();
