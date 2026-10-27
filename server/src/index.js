import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb();
const app = createApp(db);

// Serve the built web app when present, so `npm start` is a single process.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile('index.html', { root: webDist }));
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`MaatriCare API on http://localhost:${port}`));
