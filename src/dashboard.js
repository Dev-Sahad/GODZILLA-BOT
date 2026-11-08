// src/dashboard.js — Interactive Web Admin Panel (HTML, CSS & JavaScript)
// Full control over GODZILLA bot from any web browser

import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import { config } from './config.js';
import { formatBytes } from './helpers.js';
import { logger } from './logger.js';

/**
 * Gather live system and bot metrics
 */
export async function getSystemStats(sock) {
  const mem = process.memoryUsage();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const uptimeSec = Math.floor(process.uptime());

  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);
  const secs = uptimeSec % 60;

  let groupCount = 0;
  let isConnected = false;
  if (sock) {
    try {
      isConnected = sock.ws?.isOpen || Boolean(sock.user?.id);
      const chats = await sock.groupFetchAllParticipating();
      groupCount = Object.keys(chats).length;
    } catch {}
  }

  const heapPercent = Math.min(100, Math.round((mem.heapUsed / mem.heapTotal) * 100));
  const ramPercent = Math.min(100, Math.round(((totalMem - freeMem) / totalMem) * 100));

  return {
    botName: config.botName,
    prefix: config.prefix,
    mode: config.mode,
    owner: config.ownerNumber,
    isConnected,
    uptime: `${days}d ${hours}h ${mins}m ${secs}s`,
    uptimeSeconds: uptimeSec,
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal),
    heapPercent,
    rss: formatBytes(mem.rss),
    systemRamUsed: formatBytes(totalMem - freeMem),
    systemRamTotal: formatBytes(totalMem),
    ramPercent,
    cpu: os.cpus()[0]?.model || 'Standard CPU',
    cores: os.cpus().length,
    platform: `${os.platform()} ${os.arch()}`,
    nodeVersion: process.version,
    groups: groupCount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retrieve recent log lines from godzilla.log
 */
export async function getRecentLogs() {
  const logFile = './godzilla.log';
  try {
    if (await fs.pathExists(logFile)) {
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.slice(-100).join('\n');
    }
    return '[GODZILLA] Log file initializing...';
  } catch (err) {
    return `[GODZILLA] Unable to read log file: ${err.message}`;
  }
}

/**
 * Render the full-featured HTML & CSS & JS Web Admin Dashboard
 */
export function renderWebDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🦖 GODZILLA — Web Admin Control Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card: rgba(23, 31, 48, 0.75);
      --card-hover: rgba(30, 41, 63, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --primary: #10b981;
      --primary-glow: rgba(16, 185, 129, 0.25);
      --accent: #6366f1;
      --danger: #ef4444;
      --warning: #f59e0b;
      --text: #f9fafb;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1.5rem;
      background-image: 
        radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.12) 0%, transparent 40%);
    }
    .container { max-width: 1180px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 0.85rem; }
    .brand h1 { font-size: 1.7rem; font-weight: 800; letter-spacing: -0.5px; }
    .badge {
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge.disconnected {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor; box-shadow: 0 0 10px currentColor;
    }
    .auth-bar { display: flex; align-items: center; gap: 0.6rem; }
    .auth-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
    }
    .auth-input:focus { border-color: var(--accent); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 1.5rem;
      backdrop-filter: blur(14px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }
    .card-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.95rem;
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--text-muted); }
    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #fff;
    }
    .progress-bar-container {
      width: 100%;
      height: 7px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      margin-top: 0.4rem;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--primary));
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .tag {
      background: rgba(255, 255, 255, 0.08);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    .btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-danger { background: var(--danger); }
    .btn-success { background: var(--primary); }
    .btn-warning { background: var(--warning); color: #000; }
    .btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .form-group { margin-top: 1rem; }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-control {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: border 0.2s;
    }
    .form-control:focus { border-color: var(--accent); }
    textarea.form-control { resize: vertical; min-height: 80px; }
    .terminal {
      background: #05070d;
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.6;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
      display: none;
    }
    .alert-success { background: rgba(16, 185, 129, 0.15); color: var(--primary); border: 1px solid var(--primary); }
    .alert-error { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1>🦖 <span id="headerBotName">GODZILLA</span></h1>
        <div id="statusBadge" class="badge">
          <span class="pulse-dot"></span>
          <span id="statusText">CONNECTING...</span>
        </div>
      </div>
      <div class="auth-bar">
        <input type="password" id="adminKey" class="auth-input" placeholder="Admin Password" />
        <button class="btn" onclick="saveKey()">Set Key</button>
      </div>
    </header>

    <div id="actionAlert" class="alert"></div>

    <div class="grid">
      <!-- System Vitals Card -->
      <div class="card">
        <div class="card-title">📊 System & Bot Vitals</div>
        <div class="stat-row">
          <span class="stat-label">Bot Identity</span>
          <span class="stat-value" id="valBotName">...</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Command Prefix</span>
          <span class="stat-value"><span class="tag" id="valPrefix">.</span></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Current Mode</span>
          <span class="stat-value" id="valMode" style="color: #38bdf8;">...</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Groups Active</span>
          <span class="stat-value" id="valGroups">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Live Uptime</span>
          <span class="stat-value" id="valUptime" style="color: #34d399;">...</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">AI Engine</span>
          <span class="stat-value" style="color: #a78bfa;">Google Gemini AI</span>
        </div>
      </div>

      <!-- Resources & Hardware Card -->
      <div class="card">
        <div class="card-title">🧠 Memory & Resources</div>
        <div class="stat-row">
          <span class="stat-label">Heap Memory</span>
          <span class="stat-value" id="valHeap">...</span>
        </div>
        <div class="progress-bar-container">
          <div id="heapBar" class="progress-bar" style="width: 0%"></div>
        </div>

        <div class="stat-row" style="margin-top: 0.6rem;">
          <span class="stat-label">System RAM</span>
          <span class="stat-value" id="valRam">...</span>
        </div>
        <div class="progress-bar-container">
          <div id="ramBar" class="progress-bar" style="width: 0%"></div>
        </div>

        <div class="stat-row" style="margin-top: 0.6rem;">
          <span class="stat-label">Node Runtime</span>
          <span class="stat-value" id="valNode">...</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Platform</span>
          <span class="stat-value" id="valPlatform">...</span>
        </div>
      </div>

      <!-- Quick Actions Card -->
      <div class="card">
        <div class="card-title">⚡ Master Controls</div>
        
        <div class="form-group" style="margin-top: 0;">
          <label>Change Bot Access Mode</label>
          <div class="btn-group">
            <button class="btn btn-success" onclick="triggerAction('setMode', { mode: 'public' })">Public</button>
            <button class="btn btn-warning" onclick="triggerAction('setMode', { mode: 'private' })">Private</button>
            <button class="btn" onclick="triggerAction('setMode', { mode: 'group' })">Group Only</button>
          </div>
        </div>

        <div class="form-group">
          <label>Maintenance Operations</label>
          <div class="btn-group">
            <button class="btn btn-warning" onclick="triggerAction('clearTemp')">🧹 Clear Temp Media</button>
            <button class="btn btn-danger" onclick="if(confirm('Reboot GODZILLA bot process now?')) triggerAction('restart')">🔄 Reboot Bot</button>
          </div>
        </div>

        <div class="form-group">
          <label>Quick Prefix Change</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="inputPrefix" class="form-control" placeholder="e.g. !" style="max-width: 100px;" />
            <button class="btn" onclick="triggerAction('setPrefix', { prefix: document.getElementById('inputPrefix').value })">Update</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Broadcast & Send Message Section -->
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));">
      <div class="card">
        <div class="card-title">📢 Broadcast Announcement to All Groups</div>
        <textarea id="broadcastText" class="form-control" placeholder="Enter announcement text to deliver across all participating groups..."></textarea>
        <button class="btn btn-success" style="margin-top: 1rem; width: 100%;" onclick="sendBroadcast()">📢 Send Group Broadcast</button>
      </div>

      <div class="card">
        <div class="card-title">💬 Send Direct WhatsApp Message</div>
        <input type="text" id="directTarget" class="form-control" placeholder="Phone with country code (e.g. 919876543210)" style="margin-bottom: 0.75rem;" />
        <textarea id="directMessage" class="form-control" placeholder="Write message..."></textarea>
        <button class="btn" style="margin-top: 1rem; width: 100%;" onclick="sendDirect()">✉️ Dispatch Message</button>
      </div>
    </div>

    <!-- Live Logs Terminal -->
    <div class="card" style="margin-top: 1.5rem;">
      <div class="card-title" style="display: flex; justify-content: space-between;">
        <span>📜 Live Terminal Activity Log</span>
        <span style="font-size: 0.75rem; text-transform: none; color: #34d399;">● Auto-updating</span>
      </div>
      <div id="terminal" class="terminal">Loading logs...</div>
    </div>
  </div>

  <script>
    const savedKey = localStorage.getItem('godzilla_admin_key') || '';
    if (savedKey) document.getElementById('adminKey').value = savedKey;

    function saveKey() {
      const key = document.getElementById('adminKey').value.trim();
      localStorage.setItem('godzilla_admin_key', key);
      showAlert('Admin password saved locally!', 'success');
    }

    function showAlert(msg, type = 'success') {
      const el = document.getElementById('actionAlert');
      el.className = 'alert ' + (type === 'success' ? 'alert-success' : 'alert-error');
      el.innerText = msg;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 5000);
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const d = await res.json();

        document.getElementById('headerBotName').innerText = d.botName;
        document.getElementById('valBotName').innerText = d.botName;
        document.getElementById('valPrefix').innerText = d.prefix;
        document.getElementById('valMode').innerText = d.mode.toUpperCase();
        document.getElementById('valGroups').innerText = d.groups;
        document.getElementById('valUptime').innerText = d.uptime;

        document.getElementById('valHeap').innerText = d.heapUsed + ' / ' + d.heapTotal;
        document.getElementById('heapBar').style.width = d.heapPercent + '%';

        document.getElementById('valRam').innerText = d.systemRamUsed + ' / ' + d.systemRamTotal;
        document.getElementById('ramBar').style.width = d.ramPercent + '%';

        document.getElementById('valNode').innerText = d.nodeVersion;
        document.getElementById('valPlatform').innerText = d.platform;

        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');
        if (d.isConnected) {
          badge.className = 'badge';
          text.innerText = 'CONNECTED';
        } else {
          badge.className = 'badge disconnected';
          text.innerText = 'OFFLINE / WAITING';
        }
      } catch {}
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
          const text = await res.text();
          const term = document.getElementById('terminal');
          term.innerText = text;
          term.scrollTop = term.scrollHeight;
        }
      } catch {}
    }

    async function triggerAction(action, payload = {}) {
      const key = document.getElementById('adminKey').value.trim();
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': key,
          },
          body: JSON.stringify({ action, ...payload }),
        });
        const data = await res.json();
        if (res.ok) {
          showAlert(data.message || 'Action executed successfully!', 'success');
          fetchStats();
        } else {
          showAlert(data.error || 'Action failed.', 'error');
        }
      } catch (err) {
        showAlert(err.message, 'error');
      }
    }

    function sendBroadcast() {
      const text = document.getElementById('broadcastText').value.trim();
      if (!text) return alert('Enter announcement text');
      triggerAction('broadcast', { message: text });
      document.getElementById('broadcastText').value = '';
    }

    function sendDirect() {
      const to = document.getElementById('directTarget').value.trim();
      const text = document.getElementById('directMessage').value.trim();
      if (!to || !text) return alert('Enter recipient and message text');
      triggerAction('sendMessage', { to, message: text });
      document.getElementById('directMessage').value = '';
    }

    fetchStats();
    fetchLogs();
    setInterval(fetchStats, 3000);
    setInterval(fetchLogs, 2500);
  </script>
</body>
</html>`;
}

/**
 * Handle incoming HTTP requests for Admin Panel & REST endpoints
 */
export async function handleDashboardRequest(req, res, getSock) {
  const url = req.url?.split('?')[0] || '/';
  const method = req.method;

  // 1. JSON System Stats API
  if (method === 'GET' && url === '/api/stats') {
    const sock = getSock ? getSock() : null;
    const stats = await getSystemStats(sock);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(stats, null, 2));
  }

  // 2. Terminal Activity Logs
  if (method === 'GET' && url === '/api/logs') {
    const logs = await getRecentLogs();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(logs);
  }

  // 3. Admin Control Action API
  if (method === 'POST' && url === '/api/action') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const password = req.headers['x-admin-password'];
        if (password !== config.adminPassword) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: Incorrect Admin Password' }));
        }

        const data = JSON.parse(body || '{}');
        const action = data.action;
        const sock = getSock ? getSock() : null;

        if (action === 'setMode') {
          if (!['public', 'private', 'group'].includes(data.mode)) throw new Error('Invalid mode');
          config.mode = data.mode;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Mode changed to ${data.mode.toUpperCase()}` }));
        }

        if (action === 'setPrefix') {
          if (!data.prefix) throw new Error('Prefix cannot be empty');
          config.prefix = data.prefix.trim();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Prefix changed to ${config.prefix}` }));
        }

        if (action === 'clearTemp') {
          await fs.ensureDir(config.tempDir);
          const files = await fs.readdir(config.tempDir);
          let totalBytes = 0;
          for (const file of files) {
            const p = path.join(config.tempDir, file);
            const stat = await fs.stat(p);
            totalBytes += stat.size;
            await fs.remove(p);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            message: `Cleared ${files.length} temp files (${formatBytes(totalBytes)} freed)`,
          }));
        }

        if (action === 'restart') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Bot reboot initiated...' }));
          setTimeout(() => process.exit(0), 1000);
          return;
        }

        if (action === 'broadcast') {
          if (!sock) throw new Error('Bot socket is not connected');
          const chats = await sock.groupFetchAllParticipating();
          const groupIds = Object.keys(chats);
          let sent = 0;
          for (const gid of groupIds) {
            try {
              await sock.sendMessage(gid, {
                text: `📢 *Announcement from ${config.botName} Admin*\n\n${data.message}`,
              });
              sent++;
              await new Promise(r => setTimeout(r, 1000));
            } catch {}
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Broadcast delivered to ${sent}/${groupIds.length} groups!` }));
        }

        if (action === 'sendMessage') {
          if (!sock) throw new Error('Bot socket is not connected');
          const rawTarget = data.to.trim();
          const target = rawTarget.includes('@') ? rawTarget : `${rawTarget.replace(/\+/g, '')}@s.whatsapp.net`;
          await sock.sendMessage(target, { text: data.message });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Message sent to ${rawTarget}` }));
        }

        throw new Error(`Unknown action: ${action}`);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Serve HTML & CSS Admin Panel Page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end(renderWebDashboard());
}
