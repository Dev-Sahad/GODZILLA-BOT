// src/dashboard.js — Advanced Web Admin Panel (HTML, CSS & JavaScript)
// Full 24/7 Control Center for GODZILLA Bot with In-Browser QR Scanner & Session Manager

import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { config } from './config.js';
import { formatBytes } from './helpers.js';
import { logger } from './logger.js';
import { getSessionBase64 } from './session.js';

let latestQrDataUrl = null;

export function setLatestQr(qrDataUrl) {
  latestQrDataUrl = qrDataUrl;
}

export function clearLatestQr() {
  latestQrDataUrl = null;
}

/**
 * Gather real-time system, network, and WhatsApp metrics
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

  let groupList = [];
  let isConnected = false;

  if (sock) {
    try {
      isConnected = Boolean(sock.user?.id) || sock.ws?.isOpen;
      const chats = await sock.groupFetchAllParticipating();
      groupList = Object.entries(chats).map(([jid, data]) => ({
        jid,
        subject: data.subject || 'Unnamed Group',
        members: data.participants?.length || 0,
        creation: data.creation ? new Date(data.creation * 1000).toLocaleDateString() : 'N/A',
      }));
    } catch {}
  }

  const heapPercent = Math.min(100, Math.round((mem.heapUsed / mem.heapTotal) * 100));
  const ramPercent = Math.min(100, Math.round(((totalMem - freeMem) / totalMem) * 100));
  const sessionString = await getSessionBase64();

  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || null;

  return {
    botName: config.botName,
    prefix: config.prefix,
    mode: config.mode,
    owner: config.ownerNumber,
    isConnected,
    hasSession: Boolean(sessionString),
    sessionString: sessionString || '',
    qrCode: latestQrDataUrl,
    externalUrl,
    keepAliveActive: Boolean(externalUrl),
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
    groups: groupList,
    groupCount: groupList.length,
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
      return lines.slice(-120).join('\n');
    }
    return '[GODZILLA] Logger initialized. Waiting for incoming events...';
  } catch (err) {
    return `[GODZILLA] Log stream unavailable: ${err.message}`;
  }
}

/**
 * Render complete responsive HTML5 & CSS3 Web Admin Panel
 */
export function renderWebDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🦖 GODZILLA — Web Admin Control Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --card: rgba(18, 24, 38, 0.78);
      --card-hover: rgba(26, 35, 54, 0.9);
      --border: rgba(255, 255, 255, 0.08);
      --primary: #10b981;
      --accent: #6366f1;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #0ea5e9;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 1.5rem 1rem;
      background-image: 
        radial-gradient(circle at 12% 15%, rgba(99, 102, 241, 0.16) 0%, transparent 45%),
        radial-gradient(circle at 88% 85%, rgba(16, 185, 129, 0.12) 0%, transparent 45%);
    }
    .container { max-width: 1240px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.8rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 0.85rem; }
    .brand h1 { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.5px; }
    .badge {
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary);
      padding: 0.4rem 0.85rem;
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
    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.05); }
    .tab-btn.active {
      color: #fff;
      background: var(--card);
      border-color: var(--border);
      border-bottom-color: var(--primary);
    }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1.1rem;
      padding: 1.4rem;
      backdrop-filter: blur(14px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }
    .card-title {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.92rem;
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--text-muted); }
    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #fff;
    }
    .progress-bar-container {
      width: 100%; height: 7px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px; margin-top: 0.4rem;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--primary));
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .btn {
      background: var(--accent);
      color: #fff; border: none;
      padding: 0.55rem 1rem; border-radius: 8px;
      font-weight: 600; font-size: 0.85rem;
      cursor: pointer; display: inline-flex;
      align-items: center; gap: 0.4rem;
      transition: all 0.2s ease;
    }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-success { background: var(--primary); }
    .btn-danger { background: var(--danger); }
    .btn-warning { background: var(--warning); color: #000; }
    .btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .form-group { margin-top: 1rem; }
    .form-group label {
      display: block; font-size: 0.78rem; font-weight: 700;
      color: var(--text-muted); margin-bottom: 0.35rem;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .form-control {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: #fff; padding: 0.65rem 0.85rem;
      border-radius: 8px; font-family: inherit; font-size: 0.9rem;
      outline: none; transition: border 0.2s;
    }
    .form-control:focus { border-color: var(--accent); }
    textarea.form-control { resize: vertical; min-height: 85px; }
    .terminal {
      background: #04060b;
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      height: 270px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.55;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--border);
      border-radius: 1rem;
      text-align: center;
    }
    .qr-img {
      max-width: 250px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      margin-bottom: 0.75rem;
    }
    .session-box {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      background: #04060b;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
      height: 90px;
      overflow-y: auto;
      word-break: break-all;
      color: #a78bfa;
      margin-bottom: 0.75rem;
    }
    .alert {
      padding: 0.75rem 1rem; border-radius: 8px;
      font-size: 0.85rem; margin-bottom: 1.25rem; display: none;
    }
    .alert-success { background: rgba(16, 185, 129, 0.15); color: var(--primary); border: 1px solid var(--primary); }
    .alert-error { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    .table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .table th, .table td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    .table th { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; }
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
      <div style="display: flex; gap: 0.6rem; align-items: center;">
        <input type="password" id="adminKey" class="form-control" placeholder="Admin Password" style="max-width: 170px; padding: 0.45rem 0.75rem; font-size: 0.85rem;" />
        <button class="btn btn-secondary" onclick="saveKey()">Set Key</button>
      </div>
    </header>

    <div id="actionAlert" class="alert"></div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('tab-dashboard')">📊 Dashboard & Vitals</button>
      <button class="tab-btn" onclick="switchTab('tab-session')">🔐 24/7 Session & QR</button>
      <button class="tab-btn" onclick="switchTab('tab-groups')">👥 Groups Manager</button>
      <button class="tab-btn" onclick="switchTab('tab-broadcast')">📢 Broadcast & Chat</button>
      <button class="tab-btn" onclick="switchTab('tab-terminal')">💻 Terminal & Shell</button>
      <button class="tab-btn" onclick="switchTab('tab-settings')">⚙️ Settings</button>
    </div>

    <!-- TAB 1: DASHBOARD -->
    <div id="tab-dashboard" class="tab-pane active">
      <div class="grid">
        <div class="card">
          <div class="card-title">🤖 Bot Information</div>
          <div class="stat-row">
            <span class="stat-label">Bot Identity</span>
            <span class="stat-value" id="valBotName">...</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Command Prefix</span>
            <span class="stat-value"><span id="valPrefix" style="background: rgba(255,255,255,0.08); padding: 0.2rem 0.5rem; border-radius: 6px;">.</span></span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Active Mode</span>
            <span class="stat-value" id="valMode" style="color: #38bdf8;">...</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Participating Groups</span>
            <span class="stat-value" id="valGroupCount">0</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Continuous Uptime</span>
            <span class="stat-value" id="valUptime" style="color: #34d399;">...</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">AI Engine</span>
            <span class="stat-value" style="color: #a78bfa;">Google Gemini AI</span>
          </div>
        </div>

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
            <span class="stat-label">Host OS</span>
            <span class="stat-value" id="valPlatform">...</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">⏰ 24/7 Keep-Alive Engine</div>
          <div class="stat-row">
            <span class="stat-label">Self-Pinger Status</span>
            <span class="stat-value" id="valKeepAliveStatus" style="color: #34d399;">ACTIVE (Every 8m)</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Detected URL</span>
            <span class="stat-value" id="valExternalUrl" style="font-size: 0.78rem;">Local / Host</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.75rem; line-height: 1.5;">
            Render free instances sleep after 15m. GODZILLA's built-in Keep-Alive engine continuously pings itself so your bot stays online 24/7 without shutting down.
          </p>
          <div class="btn-group" style="margin-top: 0.75rem;">
            <button class="btn btn-secondary" onclick="triggerAction('clearTemp')">🧹 Wipe Temp Media</button>
            <button class="btn btn-danger" onclick="if(confirm('Reboot GODZILLA now?')) triggerAction('restart')">🔄 Reboot Bot</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>📜 Live Activity Log</span>
          <span style="font-size: 0.75rem; color: #34d399;">● Auto-updating</span>
        </div>
        <div id="terminalLog" class="terminal">Loading log stream...</div>
      </div>
    </div>

    <!-- TAB 2: 24/7 SESSION & IN-BROWSER QR -->
    <div id="tab-session" class="tab-pane">
      <div class="grid">
        <div class="card">
          <div class="card-title">📱 In-Browser WhatsApp QR Scanner</div>
          <div id="qrSection" class="qr-container">
            <div id="qrLoading">Checking WhatsApp connection status...</div>
            <img id="qrImage" class="qr-img" style="display:none;" alt="Scan WhatsApp QR" />
            <p id="qrInstructions" style="font-size: 0.85rem; color: var(--text-muted); display:none;">
              Open WhatsApp > <b>Settings > Linked Devices > Link a Device</b> and point your camera here.
            </p>
            <div id="qrConnected" style="display:none; color: var(--primary); font-weight: 700; padding: 1.5rem 0;">
              ✅ WhatsApp Connected! No QR scan needed.
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🔐 Permanent Cloud Session (Never Login Again)</div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem; line-height: 1.5;">
            Copy this string and paste it into your <b>Render / Railway Dashboard > Environment Variables</b> as <code>GODZILLA_SESSION</code>. Once added, the bot will <b>never ask to scan QR code again</b> even after cloud restarts or deployments!
          </p>
          <div id="sessionBox" class="session-box">No session generated yet. Scan QR first.</div>
          <div class="btn-group">
            <button class="btn btn-success" onclick="copySession()">📋 Copy GODZILLA_SESSION</button>
            <button class="btn btn-secondary" onclick="downloadSession()">📥 Download Backup</button>
            <button class="btn" onclick="triggerAction('sendSessionToOwner')">💬 Send to My WhatsApp</button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: GROUPS MANAGER -->
    <div id="tab-groups" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>👥 Participating Groups (<span id="tableGroupCount">0</span>)</span>
          <button class="btn btn-secondary" onclick="fetchStats()">🔄 Refresh Groups</button>
        </div>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Group ID (JID)</th>
                <th>Members</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="groupsTableBody">
              <tr><td colspan="4" style="color: var(--text-muted); text-align: center;">Loading groups list...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: BROADCAST & CHAT -->
    <div id="tab-broadcast" class="tab-pane">
      <div class="grid">
        <div class="card">
          <div class="card-title">📢 Broadcast Announcement to All Groups</div>
          <div class="form-group" style="margin-top: 0;">
            <label>Announcement Message</label>
            <textarea id="broadcastText" class="form-control" placeholder="Write announcement to deliver across all participating groups..."></textarea>
          </div>
          <button class="btn btn-success" style="margin-top: 1rem; width: 100%;" onclick="sendBroadcast()">📢 Dispatch Group Broadcast</button>
        </div>

        <div class="card">
          <div class="card-title">💬 Send Direct WhatsApp Message</div>
          <div class="form-group" style="margin-top: 0;">
            <label>Recipient WhatsApp Number or Group ID</label>
            <input type="text" id="directTarget" class="form-control" placeholder="e.g. 919876543210 or 12345-67890@g.us" />
          </div>
          <div class="form-group">
            <label>Message Content</label>
            <textarea id="directMessage" class="form-control" placeholder="Type message to send..."></textarea>
          </div>
          <button class="btn" style="margin-top: 1rem; width: 100%;" onclick="sendDirect()">✉️ Send Message</button>
        </div>
      </div>
    </div>

    <!-- TAB 5: TERMINAL & SHELL -->
    <div id="tab-terminal" class="tab-pane">
      <div class="grid">
        <div class="card">
          <div class="card-title">⚡ Interactive Shell Execution</div>
          <div class="form-group" style="margin-top: 0;">
            <label>Terminal / Shell Command</label>
            <input type="text" id="shellCmd" class="form-control" placeholder="e.g. git status, uptime, ls -la" />
          </div>
          <button class="btn btn-warning" style="margin-top: 0.75rem;" onclick="runShell()">Run Terminal Command</button>
          <div class="form-group">
            <label>Output Console</label>
            <div id="shellOutput" class="terminal" style="height: 160px;">Ready for shell input...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">💻 Dynamic JavaScript Eval Playground</div>
          <div class="form-group" style="margin-top: 0;">
            <label>JavaScript Expression (Full Runtime Access)</label>
            <textarea id="evalCode" class="form-control" placeholder="e.g. Object.keys(config)"></textarea>
          </div>
          <button class="btn" style="margin-top: 0.75rem;" onclick="runEval()">Execute JavaScript</button>
          <div class="form-group">
            <label>Eval Result</label>
            <div id="evalOutput" class="terminal" style="height: 160px; color: #a78bfa;">Ready for JS eval...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: SETTINGS -->
    <div id="tab-settings" class="tab-pane">
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-title">⚙️ Bot Settings & Configuration</div>

        <div class="form-group">
          <label>Command Prefix</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="cfgPrefix" class="form-control" style="max-width: 120px;" />
            <button class="btn" onclick="triggerAction('setPrefix', { prefix: document.getElementById('cfgPrefix').value })">Update Prefix</button>
          </div>
        </div>

        <div class="form-group">
          <label>Bot Display Name</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="cfgName" class="form-control" />
            <button class="btn" onclick="triggerAction('setName', { name: document.getElementById('cfgName').value })">Rename Bot</button>
          </div>
        </div>

        <div class="form-group">
          <label>Access Mode</label>
          <div class="btn-group">
            <button class="btn btn-success" onclick="triggerAction('setMode', { mode: 'public' })">Public (All)</button>
            <button class="btn btn-warning" onclick="triggerAction('setMode', { mode: 'private' })">Private (Owner Only)</button>
            <button class="btn" onclick="triggerAction('setMode', { mode: 'group' })">Group Mode Only</button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <script>
    let currentSessionString = '';

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

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      event.currentTarget.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const d = await res.json();

        document.getElementById('headerBotName').innerText = d.botName;
        document.getElementById('valBotName').innerText = d.botName;
        document.getElementById('valPrefix').innerText = d.prefix;
        document.getElementById('cfgPrefix').value = d.prefix;
        document.getElementById('cfgName').value = d.botName;
        document.getElementById('valMode').innerText = d.mode.toUpperCase();
        document.getElementById('valGroupCount').innerText = d.groupCount;
        document.getElementById('tableGroupCount').innerText = d.groupCount;
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
          text.innerText = 'ONLINE 24/7';
        } else {
          badge.className = 'badge disconnected';
          text.innerText = 'OFFLINE / PAIRING';
        }

        if (d.externalUrl) {
          document.getElementById('valExternalUrl').innerText = d.externalUrl;
          document.getElementById('valKeepAliveStatus').innerText = 'ACTIVE (Every 8m)';
        }

        // QR Code Handling
        const qrImg = document.getElementById('qrImage');
        const qrLoading = document.getElementById('qrLoading');
        const qrInst = document.getElementById('qrInstructions');
        const qrConn = document.getElementById('qrConnected');

        if (d.isConnected) {
          qrLoading.style.display = 'none';
          qrImg.style.display = 'none';
          qrInst.style.display = 'none';
          qrConn.style.display = 'block';
        } else if (d.qrCode) {
          qrLoading.style.display = 'none';
          qrImg.src = d.qrCode;
          qrImg.style.display = 'block';
          qrInst.style.display = 'block';
          qrConn.style.display = 'none';
        } else {
          qrLoading.innerText = 'Waiting for WhatsApp pairing code...';
          qrLoading.style.display = 'block';
          qrImg.style.display = 'none';
          qrInst.style.display = 'none';
          qrConn.style.display = 'none';
        }

        // Session Handling
        currentSessionString = d.sessionString || '';
        const sBox = document.getElementById('sessionBox');
        if (currentSessionString) {
          sBox.innerText = currentSessionString;
        } else {
          sBox.innerText = 'No session generated yet. Scan QR first.';
        }

        // Groups table render
        const tbody = document.getElementById('groupsTableBody');
        if (d.groups && d.groups.length > 0) {
          tbody.innerHTML = d.groups.map(g => \`
            <tr>
              <td><b>\${g.subject}</b></td>
              <td><code>\${g.jid}</code></td>
              <td>\${g.members} members</td>
              <td><button class="btn btn-danger" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="leaveGroup('\${g.jid}')">Leave</button></td>
            </tr>
          \`).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">No groups detected.</td></tr>';
        }

      } catch {}
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
          const text = await res.text();
          const term = document.getElementById('terminalLog');
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
        return data;
      } catch (err) {
        showAlert(err.message, 'error');
      }
    }

    function copySession() {
      if (!currentSessionString) return alert('No session string available yet. Scan QR first!');
      navigator.clipboard.writeText(currentSessionString).then(() => {
        showAlert('Copied GODZILLA_SESSION to clipboard! Paste it into Render / Railway env vars.', 'success');
      });
    }

    function downloadSession() {
      if (!currentSessionString) return alert('No session string available.');
      const blob = new Blob([currentSessionString], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'GODZILLA_SESSION.txt';
      a.click();
    }

    function leaveGroup(jid) {
      if (confirm('Leave this group?')) {
        triggerAction('leaveGroup', { jid });
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

    async function runShell() {
      const cmd = document.getElementById('shellCmd').value.trim();
      if (!cmd) return alert('Enter shell command');
      const box = document.getElementById('shellOutput');
      box.innerText = 'Executing: ' + cmd + '...';
      const res = await triggerAction('execShell', { command: cmd });
      if (res && res.output) {
        box.innerText = res.output;
      }
    }

    async function runEval() {
      const code = document.getElementById('evalCode').value.trim();
      if (!code) return alert('Enter JS code');
      const box = document.getElementById('evalOutput');
      box.innerText = 'Evaluating...';
      const res = await triggerAction('evalJs', { code });
      if (res && res.output) {
        box.innerText = res.output;
      }
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

  // 1. JSON System Stats API & Health Check
  if (method === 'GET' && (url === '/api/stats' || url === '/api/ping')) {
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
          return res.end(JSON.stringify({ message: `Access mode updated to ${data.mode.toUpperCase()}` }));
        }

        if (action === 'setPrefix') {
          if (!data.prefix) throw new Error('Prefix cannot be empty');
          config.prefix = data.prefix.trim();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Prefix changed to ${config.prefix}` }));
        }

        if (action === 'setName') {
          if (!data.name) throw new Error('Name cannot be empty');
          config.botName = data.name.trim();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: `Bot name updated to ${config.botName}` }));
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

        if (action === 'sendSessionToOwner') {
          if (!sock) throw new Error('Bot is not connected yet.');
          const sessionString = await getSessionBase64();
          if (!sessionString) throw new Error('No session available.');
          await sock.sendMessage(config.ownerNumber, {
            text: `🔐 *GODZILLA SESSION BACKUP (RENDER 24/7)*\n\nCopy this string and set as \`GODZILLA_SESSION\` in your Render Environment Variables:\n\n\`\`\`\n${sessionString}\n\`\`\``,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Session sent to your WhatsApp number!' }));
        }

        if (action === 'leaveGroup') {
          if (!sock) throw new Error('Bot is not connected');
          await sock.groupLeave(data.jid);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Left group successfully.' }));
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

        if (action === 'execShell') {
          exec(data.command, { timeout: 30000 }, (err, stdout, stderr) => {
            let output = stdout || '';
            if (stderr) output += `\n[STDERR]:\n${stderr}`;
            if (err) output += `\n[ERROR]:\n${err.message}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ output: output.trim() || 'Command finished with no output.' }));
          });
          return;
        }

        if (action === 'evalJs') {
          try {
            let result = await eval(`(async () => { ${data.code} })()`);
            if (typeof result !== 'string') result = util.inspect(result, { depth: 2 });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ output: result }));
          } catch (evalErr) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ output: `Error: ${evalErr.message}` }));
          }
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
