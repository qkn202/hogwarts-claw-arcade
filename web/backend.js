// web/backend.js — Supabase Realtime & Cloud Save Engine cho Tiệm Gắp Thú Hogwarts
import { createClient } from '@supabase/supabase-js'

export const DEFAULT_SUPABASE_URL = 'https://fxucyrofcsuqtlkukcrx.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_zEiG2Py5kDmGhkTgw0uWIA_We0rOCGu'

export function getSupabaseConfig() {
  let url = DEFAULT_SUPABASE_URL
  let anonKey = DEFAULT_SUPABASE_ANON_KEY

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    url = import.meta.env.VITE_SUPABASE_URL || url
    anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || anonKey
  }

  return { url, anonKey }
}

/**
 * Trộn thông minh dữ liệu giữa máy hiện tại và đám mây (không làm mất dữ liệu cao hơn)
 */
export function mergeGameSaves(localState, remoteState) {
  if (!remoteState) return localState
  if (!localState) return remoteState

  // 1. Gộp Galleons
  const galleons = Math.max(
    Number.isSafeInteger(localState.galleons) ? localState.galleons : 0,
    Number.isSafeInteger(remoteState.galleons) ? remoteState.galleons : 0
  )

  // 2. Gộp Bộ sưu tập (28 loài thú)
  const collection = { ...(localState.collection || {}) }
  if (remoteState.collection && typeof remoteState.collection === 'object') {
    for (const [kind, count] of Object.entries(remoteState.collection)) {
      const num = Number.isSafeInteger(count) && count > 0 ? count : 0
      collection[kind] = Math.max(collection[kind] || 0, num)
    }
  }

  // 3. Gộp Lều Thú (Bác Hagrid)
  const petsByKind = new Map()
  for (const p of (localState.pets || [])) {
    if (p && p.kind) petsByKind.set(p.kind, { ...p })
  }

  for (const p of (remoteState.pets || [])) {
    if (!p || !p.kind) continue
    const existing = petsByKind.get(p.kind)
    if (!existing) {
      petsByKind.set(p.kind, { ...p })
    } else {
      existing.care = Math.max(existing.care || 0, p.care || 0)
      existing.food = Math.max(existing.food || 0, p.food || 0)
      existing.joy = Math.max(existing.joy || 0, p.joy || 0)
      existing.energy = Math.max(existing.energy || 0, p.energy || 0)
      if (p.name && p.name !== existing.name && p.care >= existing.care) {
        existing.name = p.name
      }
    }
  }

  const pets = Array.from(petsByKind.values())
  const active = localState.active || remoteState.active || pets[0]?.id || null

  return {
    collection,
    galleons,
    pets,
    active,
    lastSyncedAt: Date.now(),
  }
}

export class ClawArcadeBackend {
  constructor({ identity, storage, onPresenceChange, onBroadcastMessage, onSyncComplete } = {}) {
    this.identity = identity || { uid: 'guest', name: 'Phù thủy Ẩn danh', house: 'NONE' }
    this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null)
    this.onPresenceChange = onPresenceChange
    this.onBroadcastMessage = onBroadcastMessage
    this.onSyncComplete = onSyncComplete

    this.supabase = null
    this.channel = null
    this.isConnected = false
    this.onlineWizards = []
    this.localServerUrl = 'http://127.0.0.1:5182'

    this.initSupabase()
  }

  initSupabase() {
    try {
      const { url, anonKey } = getSupabaseConfig()
      this.supabase = createClient(url, anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })

      this.channel = this.supabase.channel('claw-arcade-global', {
        config: {
          presence: { key: this.identity.uid },
          broadcast: { self: false },
        },
      })

      // Lắng nghe sự kiện Presence (ai đang online)
      this.channel.on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState()
        const wizards = []
        for (const uid in state) {
          const presences = state[uid] || []
          if (presences.length > 0) {
            wizards.push(presences[0])
          }
        }
        this.onlineWizards = wizards
        this.onPresenceChange?.(wizards.length, wizards)
      })

      // Lắng nghe Broadcasts phép thuật
      this.channel.on('broadcast', { event: 'BEAST_CAUGHT' }, ({ payload }) => {
        this.onBroadcastMessage?.({
          type: 'BEAST_CAUGHT',
          ...payload,
        })
      })

      this.channel.on('broadcast', { event: 'CHEST_OPENED' }, ({ payload }) => {
        this.onBroadcastMessage?.({
          type: 'CHEST_OPENED',
          ...payload,
        })
      })

      // Kết nối Realtime
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          await this.channel.track({
            uid: this.identity.uid,
            name: this.identity.name,
            house: this.identity.house,
            joinedAt: Date.now(),
          })
          this.triggerCloudSync()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isConnected = false
        }
      })
    } catch (err) {
      console.warn('[Claw Backend] Supabase Realtime init error:', err)
      this.isConnected = false
    }
  }

  /**
   * Phát tin phép thuật khi gắp trúng sinh vật huyền bí
   */
  broadcastCatch({ kind, beastName, isBaby = true }) {
    if (!this.channel || !this.isConnected) return
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'BEAST_CAUGHT',
        payload: {
          uid: this.identity.uid,
          wizardName: this.identity.name,
          house: this.identity.house,
          kind,
          beastName,
          isBaby,
          timestamp: Date.now(),
        },
      })
    } catch (err) {
      console.warn('[Claw Backend] broadcastCatch error:', err)
    }
  }

  /**
   * Phát tin phép thuật khi mở trúng Rương Galleons Gringotts
   */
  broadcastChest({ amount, totalGals }) {
    if (!this.channel || !this.isConnected) return
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'CHEST_OPENED',
        payload: {
          uid: this.identity.uid,
          wizardName: this.identity.name,
          house: this.identity.house,
          amount,
          totalGals,
          timestamp: Date.now(),
        },
      })
    } catch (err) {
      console.warn('[Claw Backend] broadcastChest error:', err)
    }
  }

  /**
   * Đồng bộ lưu trữ đám mây
   */
  async syncSave({ collection, galleons, pets, active }) {
    const localSnapshot = {
      collection,
      galleons,
      pets,
      active,
      uid: this.identity.uid,
      wizardName: this.identity.name,
      house: this.identity.house,
      savedAt: Date.now(),
    }

    // 1. Lưu backup cục bộ
    try {
      this.storage?.setItem('momo-claw.cloud-snapshot.v1', JSON.stringify(localSnapshot))
    } catch {}

    // 2. Thử gửi lên server Node cục bộ nếu có
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.localServerUrl}/api/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localSnapshot),
          signal: AbortSignal.timeout ? AbortSignal.timeout(1500) : undefined,
        })
        if (res.ok) {
          const data = await res.json()
          if (data && data.merged) {
            this.onSyncComplete?.(data.merged)
            return data.merged
          }
        }
      } catch {
        // Local server offline, hoạt động thuần P2P/Supabase
      }
    }

    this.onSyncComplete?.(localSnapshot)
    return localSnapshot
  }

  async triggerCloudSync() {
    if (!this.storage) return
    try {
      const rawColl = this.storage.getItem('momo-claw.collection.v1')
      const rawGals = this.storage.getItem('momo-claw.gals.v1')
      const rawPets = this.storage.getItem('momo-pets.v1')

      const collection = rawColl ? JSON.parse(rawColl) : {}
      const galleons = rawGals ? parseInt(rawGals, 10) || 0 : 0
      const petsData = rawPets ? JSON.parse(rawPets) : {}

      await this.syncSave({
        collection,
        galleons,
        pets: petsData.pets || [],
        active: petsData.active || null,
      })
    } catch (err) {
      console.warn('[Claw Backend] triggerCloudSync error:', err)
    }
  }

  destroy() {
    if (this.channel && this.supabase) {
      try {
        this.supabase.removeChannel(this.channel)
      } catch {}
      this.channel = null
    }
  }
}
