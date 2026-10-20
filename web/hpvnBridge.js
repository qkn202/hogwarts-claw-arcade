// web/hpvnBridge.js — HPVN Ecosystem Identity & Parent Frame Bridge
// Tương thích 100% với giao thức HPVN Game Zone (như Cờ Tỷ Phú Hogwarts & 7 Potters)

const HOUSE_METAS = {
  GRYFFINDOR: { name: 'Gryffindor', badge: '🦁', color: '#ff4d4f', bg: 'rgba(120, 20, 20, 0.85)' },
  SLYTHERIN: { name: 'Slytherin', badge: '🐍', color: '#52c41a', bg: 'rgba(15, 60, 30, 0.85)' },
  RAVENCLAW: { name: 'Ravenclaw', badge: '🦅', color: '#1890ff', bg: 'rgba(15, 40, 80, 0.85)' },
  HUFFLEPUFF: { name: 'Hufflepuff', badge: '🦡', color: '#faad14', bg: 'rgba(80, 60, 15, 0.85)' },
  NONE: { name: 'Hogwarts', badge: '⚡', color: '#f5d076', bg: 'rgba(40, 25, 15, 0.85)' },
}

const DEFAULT_NAMES = [
  'Newt Scamander', 'Luna Lovegood', 'Rubeus Hagrid',
  'Hermione Granger', 'Harry Potter', 'Ron Weasley',
  'Neville Longbottom', 'Ginny Weasley', 'Cedric Diggory',
  'Cho Chang', 'Sirius Black', 'Remus Lupin'
]

const HOUSES = ['GRYFFINDOR', 'SLYTHERIN', 'RAVENCLAW', 'HUFFLEPUFF']

function readHandoffIdentity() {
  if (typeof window === 'undefined') return null
  try {
    const hash = window.location.hash.slice(1)
    if (!hash) return null
    const params = new URLSearchParams(hash)
    const rawHandoff = params.get('hpvn-handoff')
    const ticket = params.get('hpvn-ticket')
    if (!rawHandoff) return null

    const data = JSON.parse(decodeURIComponent(rawHandoff))
    const isFramed = window.parent !== window
    const validTicket = !ticket || data.nonce === ticket
    const isFresh = Math.abs(Date.now() - (data.issuedAt || 0)) < 10 * 60 * 1000

    if (data && typeof data.uid === 'string') {
      const houseKey = (data.house || '').toUpperCase()
      return {
        uid: data.uid,
        name: data.displayName || data.name || 'Phù thủy HPVN',
        house: HOUSE_METAS[houseKey] ? houseKey : 'NONE',
        nonce: data.nonce || '',
        isHpvnMember: true,
        isFramed,
      }
    }
  } catch (err) {
    console.warn('[HPVN Bridge] Handoff parse error:', err)
  }
  return null
}

function getLocalOrGuestIdentity(storage) {
  const GUEST_KEY = 'momo-claw.wizard-profile.v1'
  try {
    const saved = JSON.parse(storage?.getItem?.(GUEST_KEY) || 'null')
    if (saved && saved.uid && saved.name) return saved
  } catch {}

  const randomHouse = HOUSES[Math.floor(Math.random() * HOUSES.length)]
  const randomName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)]
  const uid = 'wizard-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36)

  const profile = {
    uid,
    name: randomName,
    house: randomHouse,
    isHpvnMember: false,
    isFramed: false,
  }

  try {
    storage?.setItem?.(GUEST_KEY, JSON.stringify(profile))
  } catch {}

  return profile
}

export class HpvnBridge {
  constructor(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
    this.storage = storage
    const handoff = readHandoffIdentity()
    this.identity = handoff || getLocalOrGuestIdentity(storage)

    if (this.identity.isFramed && typeof document !== 'undefined') {
      document.documentElement.classList.add('hpvn-framed')
    }

    this.setupParentListener()
  }

  getHouseMeta(houseKey) {
    return HOUSE_METAS[(houseKey || this.identity.house || '').toUpperCase()] || HOUSE_METAS.NONE
  }

  setupParentListener() {
    if (typeof window === 'undefined') return
    window.addEventListener('message', (event) => {
      const data = event.data
      if (!data || data.channel !== 'hpvn-game') return
      if (this.identity.nonce && data.nonce !== this.identity.nonce) return

      // Lắng nghe sự kiện từ portal HPVN
      if (data.action === 'sync-request') {
        this.emitToParent('sync-response', { uid: this.identity.uid, timestamp: Date.now() })
      }
    })
  }

  emitToParent(action, payload = {}) {
    if (typeof window === 'undefined' || window.parent === window) return
    try {
      window.parent.postMessage({
        channel: 'hpvn-game',
        action,
        nonce: this.identity.nonce,
        uid: this.identity.uid,
        ...payload,
      }, '*')
    } catch (err) {
      console.warn('[HPVN Bridge] emitToParent error:', err)
    }
  }

  reportGalleonsWon(amountWon, currentTotal) {
    this.emitToParent('galleons-update', {
      amountWon,
      currentTotal,
      source: 'honeydukes_claw_machine',
      timestamp: Date.now(),
    })
  }

  reportBeastCaught(kind, beastName) {
    this.emitToParent('beast-caught', {
      kind,
      beastName,
      source: 'honeydukes_claw_machine',
      timestamp: Date.now(),
    })
  }
}
