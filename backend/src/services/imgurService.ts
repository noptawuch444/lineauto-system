import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// ImgBB API - Free, no authentication required for basic usage
const IMGBB_API_KEY = 'b2285e5c017d5cac2c3ac8883a747748'; // User's API key

/**
 * Upload image to ImgBB and get HTTPS URL
 */
export async function uploadToImgur(filePath: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        console.log('\n📤 Uploading image to ImgBB...');
        console.log('   File:', filePath);

        // Read file as base64
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        // Create form data
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);

        // Upload to ImgBB
        const response = await axios.post(
            'https://api.imgbb.com/1/upload',
            formData,
            {
                headers: formData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 15000 // 15 seconds timeout
            }
        );

        if (response.data.success) {
            const imageUrl = response.data.data.url;
            console.log('✅ Uploaded successfully!');
            console.log('   URL:', imageUrl);

            return {
                success: true,
                url: imageUrl
            };
        } else {
            console.error('❌ ImgBB upload failed:', response.data);
            return {
                success: false,
                error: 'ImgBB upload failed'
            };
        }
    } catch (error: any) {
        console.error('❌ Error uploading to ImgBB:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
        return {
            success: false,
            error: error.message
        };
    }
}
