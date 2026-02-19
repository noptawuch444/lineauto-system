import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as templateService from '../services/templateService';
import { uploadToImgur } from '../services/imgurService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { checkAndSendMessages } from '../services/schedulerService';

const router = express.Router();
const prisma = new PrismaClient();

// GET template info
router.get('/template/:publicCode', async (req, res) => {
    try {
        const template = await templateService.getTemplateByPublicCode(req.params.publicCode);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        if (!template.isActive) return res.status(403).json({ error: 'Template is not active' });

        // Date check: We only block if the template is ALREADY EXPIRED.
        const now = new Date();
        if (template.endDate && now > new Date(template.endDate)) {
            return res.status(403).json({ error: 'Template has expired (Ended: ' + new Date(template.endDate).toLocaleDateString('th-TH') + ')' });
        }

        res.json({ id: template.id, name: template.name, description: template.description, category: template.category });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// GET template messages
router.get('/template/:publicCode/messages', async (req, res) => {
    try {
        const { publicCode } = req.params;
        const messages = await prisma.scheduledMessage.findMany({
            where: { userIdentifier: `template-${publicCode}` },
            orderBy: { scheduledTime: 'desc' },
            take: 30
        });
        const parsed = messages.map(m => ({
            ...m,
            targetIds: JSON.parse(m.targetIds || '[]'),
            imageUrls: m.imageUrls ? JSON.parse(m.imageUrls) : (m.imageUrl ? [m.imageUrl] : [])
        }));
        res.json(parsed);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Multer
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
    })
});

// POST upload
router.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    try {
        const resImg = await uploadToImgur(path.join(uploadDir, req.file.filename));
        if (resImg.success) {
            fs.unlinkSync(path.join(uploadDir, req.file.filename));
            res.json({ url: resImg.url });
        } else {
            res.json({ url: `/uploads/${req.file.filename}`, fallback: true });
        }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST schedule
router.post('/schedule/:publicCode', async (req, res) => {
    try {
        const { publicCode } = req.params;
        const { content, imageUrl, imageUrls, scheduledTime, imageFirst } = req.body;

        const missing = [];
        if (!content) missing.push('content');
        if (!scheduledTime) missing.push('scheduledTime');
        if (missing.length > 0) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

        const template = await templateService.getTemplateByPublicCode(publicCode);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        // Date check: Is the template already expired?
        const now = new Date();
        if (template.endDate && now > new Date(template.endDate)) {
            return res.status(403).json({ error: 'Template has expired' });
        }

        // Check if the scheduled time is within the template's validity period
        const targetTime = new Date(scheduledTime);
        if (template.startDate && targetTime < new Date(template.startDate)) {
            return res.status(400).json({ error: 'Cannot schedule before template start date' });
        }
        if (template.endDate && targetTime > new Date(template.endDate)) {
            return res.status(400).json({ error: 'Cannot schedule after template end date' });
        }

        const finalImageUrls = (imageUrls && Array.isArray(imageUrls)) ? JSON.stringify(imageUrls) : (imageUrl ? JSON.stringify([imageUrl]) : null);

        const msg = await prisma.scheduledMessage.create({
            data: {
                content,
                imageUrl: imageUrl || (imageUrls?.[0]) || null,
                imageUrls: finalImageUrls,
                scheduledTime: targetTime,
                status: 'pending',
                targetType: template.targetType,
                targetIds: template.targetIds,
                userIdentifier: `template-${publicCode}`,
                imageFirst: !!imageFirst,
                botId: template.botId
            }
        });

        // Trigger scheduler immediately if scheduledTime is now or in the past
        if (new Date(scheduledTime) <= new Date()) {
            checkAndSendMessages().catch(e => console.error('Immediate Trigger Failed:', e));
        }

        res.status(201).json({ success: true, id: msg.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE schedule
router.delete('/schedule/:publicCode/:id', async (req, res) => {
    try {
        const { publicCode, id } = req.params;
        const msg = await prisma.scheduledMessage.findUnique({ where: { id } });

        if (!msg) return res.status(404).json({ error: 'Message not found' });
        if (msg.userIdentifier !== `template-${publicCode}`) return res.status(403).json({ error: 'Unauthorized' });
        if (msg.status !== 'pending') return res.status(400).json({ error: 'Cannot delete sent or processing messages' });

        await prisma.scheduledMessage.delete({ where: { id } });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
