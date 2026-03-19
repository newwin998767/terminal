import express from "express";
import { createServer as createViteServer } from "vite";
import si from "systeminformation";
import path from "path";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/sysinfo/static", async (req, res) => {
    try {
      const [cpu, osInfo, diskLayout, fsSize] = await Promise.all([
        si.cpu(),
        si.osInfo(),
        si.diskLayout(),
        si.fsSize()
      ]);
      res.json({ cpu, osInfo, diskLayout, fsSize });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch static system info" });
    }
  });

  app.get("/api/sysinfo/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendData = async () => {
      try {
        const [mem, currentLoad, time] = await Promise.all([
          si.mem(),
          si.currentLoad(),
          si.time()
        ]);
        res.write(`data: ${JSON.stringify({ mem, currentLoad, time })}\n\n`);
      } catch (e) {
        // ignore
      }
    };

    sendData();
    const interval = setInterval(sendData, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server for Terminal
  const wss = new WebSocketServer({ server, path: '/api/terminal' });

  wss.on('connection', (ws) => {
    // We use script to emulate a PTY if possible, otherwise fallback to bash
    // The -q flag suppresses start/stop messages, -c specifies the command
    const shell = spawn('script', ['-q', '-c', 'bash', '/dev/null'], {
      env: { ...process.env, TERM: 'xterm-256color' },
      cwd: process.cwd(),
    });

    shell.stdout.on('data', (data) => {
      ws.send(data.toString());
    });

    shell.stderr.on('data', (data) => {
      ws.send(data.toString());
    });

    ws.on('message', (msg) => {
      shell.stdin.write(msg.toString());
    });

    ws.on('close', () => {
      shell.kill();
    });

    shell.on('exit', () => {
      ws.close();
    });
  });
}

startServer();
