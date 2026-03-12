const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const NOTE_FILE = process.env.NOTE_FILE || '/data/note.txt';
const PORT = process.env.PORT || 8002;

// ensure data directory exists
fs.mkdirSync(path.dirname(NOTE_FILE), { recursive: true });

function load() {
  try { return fs.readFileSync(NOTE_FILE, 'utf8'); }
  catch { return ''; }
}

let writeTimer = null;
let pending = null;

function save(text) {
  pending = text;
  if (!writeTimer) {
    writeTimer = setTimeout(() => {
      fs.writeFileSync(NOTE_FILE, pending, 'utf8');
      writeTimer = null;
    }, 300);
  }
}

// ── HTTP ──
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    return res.end('ok');
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
  }

  res.writeHead(404);
  res.end('not found');
});

// ── WebSocket ──
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', ws => {
  // send current note on connect
  ws.send(load());

  ws.on('message', data => {
    const text = data.toString();
    save(text);
    // broadcast to every OTHER connected client
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(text);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`notepad server on :${PORT}`);
});
