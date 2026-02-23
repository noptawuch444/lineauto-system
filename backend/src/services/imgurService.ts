import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// ImgBB API Key
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || 'b2285e5c017d5cac2c3ac8883a747748';

/**
 * Upload image to ImgBB and get HTTPS URL
 * Retries up to 2 times on failure
 */
export async function uploadToImgur(
    filePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    const MAX_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`\n📤 [ImgBB] Uploading image (attempt ${attempt}/${MAX_RETRIES})...`);
            console.log(`   File: ${path.basename(filePath)}`);

            if (!fs.existsSync(filePath)) {
                return { success: false, error: `File not found: ${filePath}` };
            }

            const imageBuffer = fs.readFileSync(filePath);
            const base64Image = imageBuffer.toString('base64');
            const fileSizeKB = Math.round(imageBuffer.length / 1024);
            console.log(`   Size: ${fileSizeKB} KB`);

            const formData = new FormData();
            formData.append('key', IMGBB_API_KEY);
            formData.append('image', base64Image);

            const response = await axios.post(
                'https://api.imgbb.com/1/upload',
                formData,
                {
                    headers: formData.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 20000 // 20 seconds
                }
            );

            if (response.data?.success) {
                const imageUrl = response.data.data.url;
                console.log(`✅ [ImgBB] Uploaded! URL: ${imageUrl}`);
                return { success: true, url: imageUrl };
            }

            console.warn(`⚠️ [ImgBB] Upload returned non-success (attempt ${attempt}):`, response.data);
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.error?.message || error.message;
            console.error(`❌ [ImgBB] Upload error (attempt ${attempt}): [${status}] ${detail}`);

            if (attempt < MAX_RETRIES) {
                const delay = 1500 * attempt;
                console.log(`   ↩️ Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                return { success: false, error: detail };
            }
        }
    }

    return { success: false, error: 'All ImgBB upload attempts failed' };
}
