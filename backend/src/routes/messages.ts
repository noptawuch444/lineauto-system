import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// POST /api/messages - Create scheduled message
router.post('/', async (req, res) => {
    try {
        const { content, imageUrl, imageUrls, scheduledTime, targetType, targetIds, channelAccessToken, imageFirst } = req.body;

        if (!content || !scheduledTime || !targetType || !targetIds) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Handle both single and multiple images
        let finalImageUrls = null;
        if (imageUrls && Array.isArray(imageUrls)) {
            finalImageUrls = JSON.stringify(imageUrls);
        } else if (imageUrl) {
            finalImageUrls = JSON.stringify([imageUrl]);
        }

        const message = await prisma.scheduledMessage.create({
            data: {
                content,
                imageUrl: imageUrl || null, // Keeping for backward compatibility
                imageUrls: finalImageUrls,
                scheduledTime: new Date(scheduledTime),
                targetType,
                targetIds: JSON.stringify(targetIds),
                channelAccessToken: channelAccessToken || null,
                imageFirst: !!imageFirst,
                status: 'pending'
            }
        });

        res.status(201).json(message);
    } catch (error: any) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/messages - List all scheduled messages
router.get('/', async (req, res) => {
    try {
        const messages = await prisma.scheduledMessage.findMany({
            orderBy: { scheduledTime: 'asc' },
            include: {
                logs: {
                    orderBy: { sentAt: 'desc' },
                    take: 1
                }
            }
        });

        // Parse targetIds and imageUrls
        const parsedMessages = messages.map(msg => ({
            ...msg,
            targetIds: JSON.parse(msg.targetIds),
            imageUrls: msg.imageUrls ? JSON.parse(msg.imageUrls) : (msg.imageUrl ? [msg.imageUrl] : [])
        }));

        res.json(parsedMessages);
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const message = await prisma.scheduledMessage.findUnique({
            where: { id },
            include: {
                logs: {
                    orderBy: { sentAt: 'desc' }
                }
            }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({
            ...message,
            targetIds: JSON.parse(message.targetIds),
            imageUrls: message.imageUrls ? JSON.parse(message.imageUrls) : (message.imageUrl ? [message.imageUrl] : [])
        });
    } catch (error: any) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/messages/:id - Update scheduled message
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, imageUrl, imageUrls, scheduledTime, targetType, targetIds, imageFirst } = req.body;

        const existingMessage = await prisma.scheduledMessage.findUnique({
            where: { id }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (existingMessage.status !== 'pending') {
            return res.status(400).json({ error: 'Can only update pending messages' });
        }

        // Logic for updating images
        let finalImageUrls = undefined;
        let finalImageUrl = undefined;

        if (imageUrls !== undefined) {
            finalImageUrls = JSON.stringify(imageUrls);
            if (imageUrls.length > 0) finalImageUrl = imageUrls[0]; // Sync legacy field
        } else if (imageUrl !== undefined) {
            finalImageUrl = imageUrl;
            finalImageUrls = imageUrl ? JSON.stringify([imageUrl]) : null;
        }

        const message = await prisma.scheduledMessage.update({
            where: { id },
            data: {
                content: content || existingMessage.content,
                imageUrl: finalImageUrl !== undefined ? finalImageUrl : existingMessage.imageUrl,
                imageUrls: finalImageUrls !== undefined ? finalImageUrls : existingMessage.imageUrls,
                scheduledTime: scheduledTime ? new Date(scheduledTime) : existingMessage.scheduledTime,
                targetType: targetType || existingMessage.targetType,
                targetIds: targetIds ? JSON.stringify(targetIds) : existingMessage.targetIds,
                imageFirst: imageFirst !== undefined ? !!imageFirst : existingMessage.imageFirst
            }
        });

        res.json({
            ...message,
            targetIds: JSON.parse(message.targetIds),
            imageUrls: message.imageUrls ? JSON.parse(message.imageUrls) : (message.imageUrl ? [message.imageUrl] : [])
        });
    } catch (error: any) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/messages/:id - Cancel scheduled message
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existingMessage = await prisma.scheduledMessage.findUnique({
            where: { id }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (existingMessage.status !== 'pending') {
            return res.status(400).json({ error: 'Can only cancel pending messages' });
        }

        const message = await prisma.scheduledMessage.update({
            where: { id },
            data: { status: 'cancelled' }
        });

        res.json({
            ...message,
            targetIds: JSON.parse(message.targetIds)
        });
    } catch (error: any) {
        console.error('Error cancelling message:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/messages/upload - Upload image to Imgur
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('\n📤 Processing image upload...');
        console.log('   Original filename:', req.file.originalname);
        console.log('   Saved as:', req.file.filename);
        console.log('   Size:', req.file.size, 'bytes');

        // Import Imgur service
        const { uploadToImgur } = await import('../services/imgurService');

        // Upload to Imgur
        const filePath = path.join(uploadDir, req.file.filename);
        const result = await uploadToImgur(filePath);

        if (result.success && result.url) {
            console.log('✅ Image uploaded to Imgur successfully!');
            console.log('   HTTPS URL:', result.url);

            // Delete local file after successful upload
            try {
                fs.unlinkSync(filePath);
                console.log('   Local file deleted');
            } catch (err) {
                console.warn('   Warning: Could not delete local file');
            }

            res.json({
                url: result.url,
                filename: req.file.originalname,
                message: 'Image uploaded to Imgur successfully'
            });
        } else {
            console.error('❌ Imgur upload failed:', result.error);

            // Return local URL as fallback (won't work with LINE but better than nothing)
            const localUrl = `/uploads/${req.file.filename}`;
            res.status(500).json({
                error: result.error || 'Failed to upload to Imgur',
                fallbackUrl: localUrl,
                message: 'Imgur upload failed. Image saved locally but LINE API requires HTTPS URL.'
            });
        }
    } catch (error: any) {
        console.error('❌ Error in upload endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
