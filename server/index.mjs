// server/index.mjs — Hogwarts Claw Machine Standalone Game Server & Cloud Sync API
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = parseInt(process.env.PORT || '5182', 10)
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'saves.json')

// Đảm bảo thư mục lưu trữ tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

/**
 * @type {Map<string, any>}
 */
let db = new Map()

// Đọc dữ liệu đã lưu nếu có
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    db = new Map(Object.entries(parsed))
  } catch (err) {
    console.warn('[Server] Error loading saves.json:', err.message)
  }
}

function persistDb() {
  try {
    const obj = Object.fromEntries(db.entries())
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Server] Error persisting saves.json:', err.message)
  }
}

/**
 * Trộn 2 bản lưu thông minh
 */
function mergeProfiles(prev, next) {
  if (!prev) return next
  const galleons = Math.max(prev.galleons || 0, next.galleons || 0)
  const collection = { ...(prev.collection || {}) }
  for (const [k, v] of Object.entries(next.collection || {})) {
    collection[k] = Math.max(collection[k] || 0, v || 0)
  }

  const petsMap = new Map()
  for (const p of (prev.pets || [])) {
    if (p?.kind) petsMap.set(p.kind, { ...p })
  }
  for (const p of (next.pets || [])) {
    if (!p?.kind) continue
    const old = petsMap.get(p.kind)
    if (!old) {
      petsMap.set(p.kind, { ...p })
    } else {
      old.care = Math.max(old.care || 0, p.care || 0)
      old.food = Math.max(old.food || 0, p.food || 0)
      old.joy = Math.max(old.joy || 0, p.joy || 0)
      old.energy = Math.max(old.energy || 0, p.energy || 0)
      if (p.name && p.name !== old.name && p.care >= old.care) {
        old.name = p.name
      }
    }
  }

  return {
    ...next,
    collection,
    galleons,
    pets: Array.from(petsMap.values()),
    active: next.active || prev.active || null,
    updatedAt: Date.now(),
  }
}

// 1. Tạo HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  // GET /api/health
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Hogwarts Claw Machine Game Server',
      uptimeSeconds: Math.round(process.uptime()),
      totalPlayers: db.size,
      activeSockets: wss.clients.size,
      timestamp: Date.now(),
    }))
    return
  }

  // GET /api/leaderboard
  if (url.pathname === '/api/leaderboard') {
    const list = Array.from(db.values())
      .map(p => {
        const beastCount = Object.values(p.collection || {}).reduce((acc, count) => acc + (count > 0 ? 1 : 0), 0)
        return {
          uid: p.uid,
          name: p.wizardName || 'Phù thủy',
          house: p.house || 'NONE',
          galleons: p.galleons || 0,
          beastCount,
          lastPlayedAt: p.savedAt || p.updatedAt || 0,
        }
      })
      .sort((a, b) => b.galleons - a.galleons || b.beastCount - a.beastCount)
      .slice(0, 50)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ leaderboard: list }))
    return
  }

  // POST /api/save
  if (url.pathname === '/api/save' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body)
        const uid = parsed.uid || 'guest'
        const existing = db.get(uid)
        const merged = mergeProfiles(existing, parsed)
        db.set(uid, merged)
        persistDb()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, merged }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // GET /api/load/:uid
  if (url.pathname.startsWith('/api/load/')) {
    const uid = url.pathname.slice('/api/load/'.length)
    const profile = db.get(uid)
    if (!profile) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Profile not found' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ profile }))
    return
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

// 2. Tạo WebSocket Server (Local Relay)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      // Broadcast tin nhắn tới tất cả client khác
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg))
        }
      }
    } catch {}
  })
})

const pingInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate()
      continue
    }
    ws.isAlive = false
    ws.ping()
  }
}, 30000)

wss.on('close', () => {
  clearInterval(pingInterval)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hogwarts Claw Server] Đang chạy tại http://127.0.0.1:${PORT}`)
})
