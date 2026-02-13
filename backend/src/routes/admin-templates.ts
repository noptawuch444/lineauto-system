import { Router } from 'express';
import * as templateService from '../services/templateService';

const router = Router();

/**
 * GET /api/admin/templates
 */
router.get('/', async (req, res) => {
    try {
        const templates = await templateService.getAllTemplates();
        res.json(templates);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * POST /api/admin/templates
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, category, targetType, targetIds, botId } = req.body;

        const missing = [];
        if (!name) missing.push('name');
        if (!targetType) missing.push('targetType');
        if (!targetIds) missing.push('targetIds');

        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
        }

        const template = await templateService.createTemplate({
            name,
            description,
            category,
            targetType,
            targetIds,
            botId
        });

        res.status(201).json(template);
    } catch (error: any) {
        console.error('Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/templates/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, description, category, targetType, targetIds, isActive, botId } = req.body;

        const template = await templateService.updateTemplate(req.params.id, {
            name,
            description,
            category,
            targetType,
            targetIds,
            isActive,
            botId
        });

        res.json(template);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/templates/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        await templateService.deleteTemplate(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/templates/:id/toggle
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const template = await templateService.toggleTemplateStatus(req.params.id);
        res.json(template);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
