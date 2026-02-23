import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') } // 10MB
});

// POST /api/messages - Create scheduled message
router.post('/', async (req, res) => {
    try {
        const {
            content, imageUrl, imageUrls, scheduledTime,
            targetType, targetIds, botId, channelAccessToken, imageFirst
        } = req.body;

        // More descriptive 400 errors
        const missing = [];
        if (!content) missing.push('content');
        if (!scheduledTime) missing.push('scheduledTime');
        if (!targetType) missing.push('targetType');
        if (!targetIds) missing.push('targetIds');

        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        let finalImageUrls = null;
        if (imageUrls && Array.isArray(imageUrls)) {
            finalImageUrls = JSON.stringify(imageUrls);
        } else if (imageUrl) {
            finalImageUrls = JSON.stringify([imageUrl]);
        }

        const message = await prisma.scheduledMessage.create({
            data: {
                content,
                imageUrl: imageUrl || null,
                imageUrls: finalImageUrls,
                scheduledTime: new Date(scheduledTime),
                targetType,
                targetIds: Array.isArray(targetIds) ? JSON.stringify(targetIds) : targetIds,
                botId: botId || null,
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
            include: { logs: { orderBy: { sentAt: 'desc' }, take: 1 } }
        });

        const parsedMessages = messages.map(msg => ({
            ...msg,
            targetIds: JSON.parse(msg.targetIds || '[]'),
            imageUrls: msg.imageUrls ? JSON.parse(msg.imageUrls) : (msg.imageUrl ? [msg.imageUrl] : [])
        }));

        res.json(parsedMessages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await prisma.scheduledMessage.findUnique({
            where: { id },
            include: { logs: { orderBy: { sentAt: 'desc' } } }
        });
        if (!message) return res.status(404).json({ error: 'Message not found' });
        res.json({
            ...message,
            targetIds: JSON.parse(message.targetIds || '[]'),
            imageUrls: message.imageUrls ? JSON.parse(message.imageUrls) : (message.imageUrl ? [message.imageUrl] : [])
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/messages/:id - Update scheduled message
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, imageUrl, imageUrls, scheduledTime, targetType, targetIds, botId, imageFirst } = req.body;
        const msg = await prisma.scheduledMessage.findUnique({ where: { id } });
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        if (msg.status !== 'pending') return res.status(400).json({ error: 'Cannot update non-pending message' });

        const message = await prisma.scheduledMessage.update({
            where: { id },
            data: {
                content: content || undefined,
                imageUrl: imageUrl || undefined,
                imageUrls: imageUrls ? JSON.stringify(imageUrls) : undefined,
                scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
                targetType: targetType || undefined,
                targetIds: targetIds ? (Array.isArray(targetIds) ? JSON.stringify(targetIds) : targetIds) : undefined,
                botId: botId || undefined,
                imageFirst: imageFirst !== undefined ? !!imageFirst : undefined
            }
        });
        res.json(message);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/messages/:id - Cancel
router.delete('/:id', async (req, res) => {
    try {
        await prisma.scheduledMessage.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// UPLOAD fallback
router.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        const { uploadToImgur } = await import('../services/imgurService');
        const resImg = await uploadToImgur(path.join(uploadDir, req.file.filename));
        if (resImg.success) {
            fs.unlinkSync(path.join(uploadDir, req.file.filename));
            res.json({ url: resImg.url });
        } else {
            // Return root-relative path. Frontend and Backend resolution handles the rest.
            res.json({ url: `/uploads/${req.file.filename}`, fallback: true });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
