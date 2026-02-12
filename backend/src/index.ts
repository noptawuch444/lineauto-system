import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import messageRoutes from './routes/messages';
import templateRoutes from './routes/templates';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhook';
import publicScheduleRoutes from './routes/public-schedule';
import liffScheduleRoutes from './routes/liff-schedule';
import adminTemplateRoutes from './routes/admin-templates';
import publicTemplateScheduleRoutes from './routes/public-template-schedule';
import botRoutes from './routes/bots';
import { initScheduler } from './services/schedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors());
// Routes
app.use('/webhook', (req, res, next) => {
    console.log(`[DEBUG] Webhook path hit: ${req.method} ${req.url}`);
    console.log(`[DEBUG] Headers:`, JSON.stringify(req.headers));
    next();
}, webhookRoutes);

// JSON and URL Parsers (Applied AFTER webhook to preserve raw body for signature verification)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/messages', messageRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicScheduleRoutes);
app.use('/api/public-template', publicTemplateScheduleRoutes);
app.use('/api/liff', liffScheduleRoutes);
app.use('/api/admin/templates', adminTemplateRoutes);
app.use('/api/bots', botRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📅 Scheduler initialized`);

    // Initialize scheduler
    initScheduler();
});

export default app;
