'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const DB = require('./server/db.js');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

const NOT_FOUND_PAGE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 — Redenção</title>
  <style>
    html, body { height: 100%; }
    body {
      margin: 0;
      display: grid;
      place-items: center;
      background: #04070b;
      color: #7fa8c9;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    h1 { margin: 0 0 .5rem; font-size: 1.4rem; letter-spacing: .1em; }
    p { margin: 0; color: #6f8396; }
  </style>
</head>
<body>
  <div>
    <h1>404</h1>
    <p>Nada por aqui além da chuva.</p>
  </div>
</body>
</html>
`;

function sendNotFound(response) {
  const body = Buffer.from(NOT_FOUND_PAGE, 'utf8');
  response.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function sendJson(response, data, status = 200) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function resolveRequestPath(requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  if (pathname.includes('\0')) {
    return null;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return null;
  }

  return filePath;
}

// API Routes
function handleApiRequest(request, response, pathname) {
  const method = request.method;

  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return true;
  }

  // GET /api/saves - list saves
  if (pathname === '/api/saves' && method === 'GET') {
    sendJson(response, DB.listSaves());
    return true;
  }

  // GET /api/save/:slot
  if (pathname.match(/^\/api\/save\/(\d+)$/) && method === 'GET') {
    const slot = parseInt(pathname.match(/\/api\/save\/(\d+)$/)[1], 10);
    const save = DB.loadGame(slot);
    sendJson(response, save || null);
    return true;
  }

  // POST /api/save/:slot
  if (pathname.match(/^\/api\/save\/(\d+)$/) && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const slot = parseInt(pathname.match(/\/api\/save\/(\d+)$/)[1], 10);
        const state = JSON.parse(body);
        DB.saveGame(slot, state);
        sendJson(response, { success: true });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // DELETE /api/save/:slot
  if (pathname.match(/^\/api\/save\/(\d+)$/) && method === 'DELETE') {
    const slot = parseInt(pathname.match(/\/api\/save\/(\d+)$/)[1], 10);
    DB.deleteSave(slot);
    sendJson(response, { success: true });
    return true;
  }

  // GET /api/inventory
  if (pathname === '/api/inventory' && method === 'GET') {
    sendJson(response, DB.getInventory());
    return true;
  }

  // POST /api/inventory/use - use item
  if (pathname === '/api/inventory/use' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { item } = JSON.parse(body);
        const success = DB.useItem(item);
        sendJson(response, { success, inventory: DB.getInventory() });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // POST /api/inventory/grant-kit - NO MERCY mandatory starter kit
  if (pathname === '/api/inventory/grant-kit' && method === 'POST') {
    const result = DB.ensureStarterKit();
    sendJson(response, { success: true, ...result });
    return true;
  }

  // GET /api/shop
  if (pathname === '/api/shop' && method === 'GET') {
    sendJson(response, DB.getShopItems());
    return true;
  }

  // POST /api/shop/buy
  if (pathname === '/api/shop/buy' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { itemId } = JSON.parse(body);
        const result = DB.buyItem(itemId);
        sendJson(response, result);
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // GET /api/achievements
  if (pathname === '/api/achievements' && method === 'GET') {
    sendJson(response, DB.getAllAchievements());
    return true;
  }

  // POST /api/achievements/unlock
  if (pathname === '/api/achievements/unlock' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const unlocked = DB.unlockAchievement(id);
        const reward = unlocked ? DB.awardCoins() : null;
        sendJson(response, {
          success: unlocked,
          achievement: DB.getAchievement(id),
          reward,
          inventory: DB.getInventory(),
        });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    sendJson(response, DB.getStats());
    return true;
  }

  // POST /api/game/end - record win/loss
  if (pathname === '/api/game/end' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { outcome, playTime } = JSON.parse(body);
        let reward = null;
        if (outcome === 'victory') {
          DB.recordWin(playTime);
          reward = DB.awardCoins(); // 50-200 moedas por zerar o jogo
        } else {
          DB.recordLoss();
          DB.addCoins(5); // consolação por derrota
          reward = { amount: 5 };
        }
        sendJson(response, { success: true, inventory: DB.getInventory(), reward });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // POST /api/coins/reward - recompensa por abate de inimigo (50-200 moedas)
  if (pathname === '/api/coins/reward' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { source } = JSON.parse(body);
        if (source !== 'enemy') {
          sendJson(response, { success: false, error: 'Fonte de recompensa inválida' }, 400);
          return;
        }
        const reward = DB.awardCoins();
        sendJson(response, { success: true, inventory: DB.getInventory(), reward });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  // POST /api/stats/increment
  if (pathname === '/api/stats/increment' && method === 'POST') {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      try {
        const { stat, amount } = JSON.parse(body);
        DB.incrementStat(stat, amount);
        sendJson(response, { success: true, stats: DB.getStats() });
      } catch (e) {
        sendJson(response, { success: false, error: 'Invalid data' }, 400);
      }
    });
    return true;
  }

  return false;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const pathname = url.pathname;

  // Handle API routes first
  if (pathname.startsWith('/api/')) {
    if (handleApiRequest(request, response, pathname)) {
      return;
    }
    sendJson(response, { error: 'Not found' }, 404);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      Allow: 'GET, HEAD',
    });
    response.end('Método não permitido');
    return;
  }

  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath) {
    sendNotFound(response);
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendNotFound(response);
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';

    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);

    stream.on('error', () => {
      if (!response.headersSent) {
        sendNotFound(response);
      } else {
        response.destroy();
      }
    });

    stream.pipe(response);
  });
});

server.listen(PORT, () => {
  console.log(`Redenção disponível em http://localhost:${PORT}`);
});
