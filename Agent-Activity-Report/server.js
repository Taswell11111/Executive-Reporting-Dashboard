import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

app.use(express.json());

// 1. Immediate Health Check (Cloud Run needs this to pass)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 2. Freshdesk Proxy
app.all(['/api/*', '/v2/*'], async (req, res) => {
  try {
    const domain = process.env.FRESHDESK_DOMAIN || 'ecomplete.freshdesk.com';
    const apiKey = process.env.FRESHDESK_API_KEY;
    const cleanPath = req.originalUrl.replace(/^\/api/, '');
    
    const response = await fetch(`https://${domain}/api${cleanPath}`, {
      method: req.method,
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(data));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 3. Static Files with Error Catching
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('<h1>Server is Live</h1><p>Frontend files are still loading or missing.</p>');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Startup Successful. Listening on ${PORT}`);
});
