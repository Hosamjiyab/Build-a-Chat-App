import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function broadcast(payload, excludeSocket = null) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(message);
    }
  });
}

wss.on('connection', (socket, req) => {
  const username =
    new URL(req.url, 'http://localhost').searchParams.get('username') ||
    'Anonymous';

  broadcast({
    type: 'system',
    text: `${username} joined`,
  });

  socket.on('message', (rawData) => {
    try {
      const parsed = JSON.parse(rawData.toString());
      broadcast({
        type: 'chat',
        username: parsed.username ?? username,
        text: parsed.text,
      });
    } catch {
      // تجاهل الرسائل غير الصالحة بصيغة JSON
    }
  });

  socket.on('close', () => {
    broadcast({
      type: 'system',
      text: `${username} left`,
    });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});