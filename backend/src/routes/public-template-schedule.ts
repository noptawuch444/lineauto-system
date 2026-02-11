import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as templateService from '../services/templateService';
import { uploadToImgur } from '../services/imgurService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/public/template/:publicCode
 * Get template by public code (for public link)
 */
router.get('/template/:publicCode', async (req, res) => {
    try {
        const { publicCode } = req.params;
        const template = await templateService.getTemplateByPublicCode(publicCode);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!template.isActive) {
            return res.status(403).json({ error: 'Template is not active' });
        }

        // Return template info (without sensitive data)
        res.json({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category
        });
    } catch (error: any) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * GET /api/public/template/:publicCode/messages
 * Get scheduled messages for this template
 */
router.get('/template/:publicCode/messages', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../../debug_output.txt');

        const log = (msg: string) => {
            const timestamp = new Date().toISOString();
            const logMsg = `[${timestamp}] ${msg}\n`;
            console.log(msg);
            try {
                fs.appendFileSync(logFile, logMsg);
            } catch (e) { /* ignore */ }
        };

        const { publicCode } = req.params;
        const searchCode = publicCode ? publicCode.trim() : '';

        log(`============ DEBUG REQUEST ============`);
        log(`Incoming publicCode raw: "${publicCode}"`);
        log(`Search Code: "${searchCode}"`);
        log(`UserIdentifier Target: template-${searchCode}`);

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // 1. Try Exact Strings first
        const messages = await prisma.scheduledMessage.findMany({
            where: {
                userIdentifier: `template-${searchCode}`
            },
            orderBy: { scheduledTime: 'desc' },
            take: 20
        });

        log(`Query 1 (Exact): Found ${messages.length} messages`);

        if (messages.length === 0) {
            // 2. Try Contains if exact fails
            const messagesContains = await prisma.scheduledMessage.findMany({
                where: {
                    userIdentifier: { contains: searchCode }
                },
                take: 5
            });
            log(`Query 2 (Contains): Found ${messagesContains.length} messages`);

            if (messagesContains.length > 0) {
                log(`Example found userIdentifier: "${messagesContains[0].userIdentifier}"`);
            }

            // 3. Dump all recent messages to see what's actually there
            const allRecent = await prisma.scheduledMessage.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { userIdentifier: true, status: true }
            });
            log(`DUMP RECENT (Last 5 in DB): ${JSON.stringify(allRecent)}`);
        } else {
            log(`Success! Returning ${messages.length} messages.`);
            log(`Sample Message Status: ${messages[0].status}`);
        }

        log(`=======================================`);

        // Parse JSON fields
        const parsedMessages = messages.map((msg: any) => ({
            ...msg,
            targetIds: msg.targetIds ? JSON.parse(msg.targetIds) : [],
            imageUrls: msg.imageUrls ? JSON.parse(msg.imageUrls) : (msg.imageUrl ? [msg.imageUrl] : [])
        }));

        res.json(parsedMessages);
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

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
        fileSize: 5 * 1024 * 1024 // 5MB
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

// ... (existing imports)

// ... (existing multer config)

/**
 * POST /api/public-template/upload
 * Upload image for public scheduler
 */
router.post('/upload', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer error:', err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        // Everything went fine.
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            console.log('Upload request received but no file found');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`Processing upload: ${req.file.originalname} (${req.file.size} bytes)`);

        // Upload to Imgur
        const filePath = path.join(uploadDir, req.file.filename);

        let result;
        try {
            result = await uploadToImgur(filePath);
        } catch (serviceError: any) {
            console.error('Imgur Service Check Failed:', serviceError);
            result = { success: false, error: serviceError.message };
        }

        if (result.success && result.url) {
            console.log('Imgur upload success:', result.url);
            // Delete local file after successful upload
            try {
                fs.unlinkSync(filePath);
            } catch (err) { /* ignore */ }

            res.json({
                url: result.url,
                filename: req.file.originalname
            });
        } else {
            console.warn('Imgur upload failed, falling back to local:', result.error);
            // Fallback to local URL if Imgur fails
            const localUrl = `/uploads/${req.file.filename}`;
            res.json({
                url: localUrl,
                filename: req.file.originalname,
                fallback: true
            });
        }
    } catch (error: any) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
});

/**
 * POST /api/public/schedule/:publicCode
 * Create scheduled message using template
 */
router.post('/schedule/:publicCode', async (req, res) => {
    try {
        const { publicCode } = req.params;
        const { content, imageUrl, imageUrls, scheduledTime } = req.body;

        if (!content || !scheduledTime) {
            return res.status(400).json({ error: 'Content and scheduledTime are required' });
        }

        // Get template
        const template = await templateService.getTemplateByPublicCode(publicCode);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!template.isActive) {
            return res.status(403).json({ error: 'Template is not active' });
        }

        // Create scheduled message using template's target IDs
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const userIdentifier = `template-${publicCode}`;
        console.log('Creating message with userIdentifier:', userIdentifier);

        // Prepare imageUrls JSON
        let finalImageUrls = null;
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
            finalImageUrls = JSON.stringify(imageUrls);
        } else if (imageUrl) {
            finalImageUrls = JSON.stringify([imageUrl]);
        }

        const scheduledMessage = await prisma.scheduledMessage.create({
            data: {
                content,
                imageUrl: imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : null),
                imageUrls: finalImageUrls,
                scheduledTime: new Date(scheduledTime),
                status: 'pending',
                targetType: template.targetType,
                targetIds: template.targetIds, // Use target IDs from template
                userIdentifier: userIdentifier
            }
        });

        console.log('Created message:', scheduledMessage.id);

        res.status(201).json({
            message: 'Scheduled message created successfully',
            id: scheduledMessage.id
        });
    } catch (error: any) {
        console.error('Error creating scheduled message:', error);
        res.status(500).json({ error: 'Failed to create scheduled message' });
    }
});

export default router;
