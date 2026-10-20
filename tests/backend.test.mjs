// tests/backend.test.mjs — Kiểm thử tự động Backend Supabase, HPVN Bridge và Cloud Sync
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { HpvnBridge } from '../web/hpvnBridge.js'
import { mergeGameSaves, getSupabaseConfig, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../web/backend.js'

test('Supabase config defaults match 7-Potters and Monopoly ecosystem', () => {
  const config = getSupabaseConfig()
  assert.equal(config.url, 'https://fxucyrofcsuqtlkukcrx.supabase.co')
  assert.equal(config.anonKey, 'sb_publishable_zEiG2Py5kDmGhkTgw0uWIA_We0rOCGu')
})

test('HpvnBridge creates consistent guest profile and house meta when outside HPVN', () => {
  const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null },
    setItem(k, v) { this._data[k] = String(v) }
  }

  const bridge = new HpvnBridge(mockStorage)
  assert.ok(bridge.identity.uid.startsWith('wizard-'))
  assert.ok(bridge.identity.name.length > 0)
  assert.equal(bridge.identity.isHpvnMember, false)

  const houseMeta = bridge.getHouseMeta(bridge.identity.house)
  assert.ok(houseMeta.badge.length > 0)
  assert.ok(houseMeta.color.startsWith('#'))

  // Re-instantiating with same storage retains same guest identity
  const bridge2 = new HpvnBridge(mockStorage)
  assert.equal(bridge2.identity.uid, bridge.identity.uid)
  assert.equal(bridge2.identity.name, bridge.identity.name)
})

test('mergeGameSaves merges collection, galleons and pets without progress loss', () => {
  const local = {
    galleons: 150,
    collection: { bear: 2, rabbit: 1, phoenix: 0 },
    pets: [
      { id: 'p1', kind: 'bear', name: 'Niffler Bé', care: 2, food: 80, joy: 70, energy: 60 }
    ],
    active: 'p1'
  }

  const remote = {
    galleons: 300,
    collection: { bear: 1, rabbit: 3, dragon: 1 },
    pets: [
      { id: 'p1', kind: 'bear', name: 'Niffler Lớn', care: 5, food: 60, joy: 90, energy: 50 },
      { id: 'p2', kind: 'dragon', name: 'Rồng Con', care: 0, food: 65, joy: 65, energy: 75 }
    ],
    active: 'p2'
  }

  const merged = mergeGameSaves(local, remote)

  // Galleons must be the higher value
  assert.equal(merged.galleons, 300)

  // Collection takes maximum per species
  assert.equal(merged.collection.bear, 2)
  assert.equal(merged.collection.rabbit, 3)
  assert.equal(merged.collection.dragon, 1)
  assert.equal(merged.collection.phoenix, 0)

  // Pets take highest care and max stats
  const bear = merged.pets.find(p => p.kind === 'bear')
  assert.ok(bear)
  assert.equal(bear.care, 5) // Care level preserved at 5
  assert.equal(bear.food, 80) // Max food
  assert.equal(bear.joy, 90) // Max joy
  assert.equal(bear.name, 'Niffler Lớn') // Name from higher care level

  const dragon = merged.pets.find(p => p.kind === 'dragon')
  assert.ok(dragon)
  assert.equal(dragon.care, 0)
})

test('Cloud save handles null or empty states gracefully', () => {
  const state = { galleons: 50, collection: { bear: 1 }, pets: [] }
  assert.deepEqual(mergeGameSaves(state, null), state)
  assert.deepEqual(mergeGameSaves(null, state), state)
})

test('Standalone Server REST APIs respond correctly', async () => {
  const { spawn } = await import('node:child_process')
  const testPort = '5188'
  const serverProc = spawn('node', ['server/index.mjs'], {
    env: { ...process.env, PORT: testPort },
    stdio: 'pipe',
  })

  // Đợi server khởi động
  await new Promise(resolve => setTimeout(resolve, 800))

  try {
    // 1. Test /api/health
    const healthRes = await fetch(`http://127.0.0.1:${testPort}/api/health`)
    assert.equal(healthRes.status, 200)
    const healthData = await healthRes.json()
    assert.equal(healthData.status, 'ok')
    assert.equal(healthData.service, 'Hogwarts Claw Machine Game Server')

    // 2. Test /api/save
    const testProfile = {
      uid: 'test-wizard-42',
      wizardName: 'Harry Potter',
      house: 'GRYFFINDOR',
      galleons: 777,
      collection: { bear: 3, phoenix: 1 },
      pets: [{ kind: 'phoenix', name: 'Fawkes', care: 7 }]
    }

    const saveRes = await fetch(`http://127.0.0.1:${testPort}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProfile),
    })
    assert.equal(saveRes.status, 200)
    const saveData = await saveRes.json()
    assert.equal(saveData.success, true)
    assert.equal(saveData.merged.galleons, 777)

    // 3. Test /api/load/:uid
    const loadRes = await fetch(`http://127.0.0.1:${testPort}/api/load/test-wizard-42`)
    assert.equal(loadRes.status, 200)
    const loadData = await loadRes.json()
    assert.equal(loadData.profile.wizardName, 'Harry Potter')
    assert.equal(loadData.profile.galleons, 777)

    // 4. Test /api/leaderboard
    const lbRes = await fetch(`http://127.0.0.1:${testPort}/api/leaderboard`)
    assert.equal(lbRes.status, 200)
    const lbData = await lbRes.json()
    assert.ok(Array.isArray(lbData.leaderboard))
    assert.ok(lbData.leaderboard.some(p => p.uid === 'test-wizard-42'))
  } finally {
    serverProc.kill()
  }
})

