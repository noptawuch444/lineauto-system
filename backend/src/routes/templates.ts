import { Router } from 'express';
import * as templateService from '../services/templateService';

const router = Router();

/**
 * GET /api/templates
 * Get all active templates (for LIFF users)
 */
router.get('/', async (req, res) => {
    try {
        const templates = await templateService.getActiveTemplates();
        res.json(templates);
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const template = await templateService.getTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    } catch (error: any) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

export default router;

