import { log } from 'console';
import { Hono } from 'hono';

const app = new Hono();

const DICT_API_BASE = process.env.DICT_API_BASE || 'http://localhost:3066';

// GET /api/words/search?q=...&offset=0&limit=1
app.get('/search', async (c) => {
  const q = c.req.query('q');
  const offset = c.req.query('offset') ?? '0';
  const limit = c.req.query('limit') ?? '1';

  if (!q) {
    return c.json({ success: false, error: 'Missing query parameter: q' }, 400);
  }

  if (!DICT_API_BASE) {
    return c.json({ success: false, error: 'Dictionary API not configured' }, 503);
  }

  try {
    const url = new URL('/api/words/search', DICT_API_BASE);
    url.searchParams.set('q', q);
    url.searchParams.set('offset', offset);
    url.searchParams.set('limit', limit);

    const res = await fetch(url.toString());
    const data = await res.json();
    return c.json(data);
  } catch {
    return c.json({ success: false, error: 'Dictionary service unavailable' }, 502);
  }
});

export default app;
