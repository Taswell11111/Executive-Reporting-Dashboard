import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

// Log startup immediately
console.log('Container starting...');

app.use(express.json());

// Basic Health Check (Must return 200 for Cloud Run to stay alive)
app.get('/health', (req, res) => res.status(200).send('OK'));

// API Proxy
app.all(['/api/*', '/v2/*'], async (req, res) => {
  const domain = process.env.FRESHDESK_DOMAIN || 'ecomplete.freshdesk.com';
  const apiKey = process.env.FRESHDESK_API_KEY;

  if (!apiKey) {
    console.error('Missing API Key');
    return res.status(500).json({ error: 'Configuration Missing' });
  }

  try {
    const cleanPath = req.originalUrl.replace(/^\/api/, '');
    const url = `https://${domain}/api${cleanPath}`;
    
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });

    const data = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(data));
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(502).json({ error: 'Upstream Error' });
  }
});

// Serve Frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully bound to port ${PORT}`);
});
