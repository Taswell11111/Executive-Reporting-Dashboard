import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Proxy Logic
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/v2/')) {
        const domain = process.env.FRESHDESK_DOMAIN || 'ecomplete.freshdesk.com';
        const apiKey = process.env.FRESHDESK_API_KEY;
        try {
            let cleanPath = req.originalUrl || req.url;
            if (cleanPath.startsWith('/v2/')) cleanPath = '/api' + cleanPath;
            const targetUrl = `https://${domain}${cleanPath}`;
            const response = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
            });
            res.status(response.status);
            const data = await response.arrayBuffer();
            return res.send(Buffer.from(data));
        } catch (e) {
            return res.status(502).json({ error: 'Proxy failed' });
        }
    }
    next();
});

// Serve local dist folder
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server ready on port ${PORT}`);
});
