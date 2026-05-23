import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import listeningRoutes from './routes/listening.js';
import fileRoutes from './routes/file.js';
import subtitleRoutes from './routes/subtitle.js';

const app = new Hono();
app.use(cors());
app.use('/uploads/*', serveStatic({ root: './' }));

app.get('/api/health', (c) => c.json({ status: 'ok' }));
app.route('/api/listening', listeningRoutes);
app.route('/api/upload', fileRoutes);
app.route('/api/upload', subtitleRoutes);

const port = 3001;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
