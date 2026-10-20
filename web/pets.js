import { TYPES, ORIGINAL_8_KINDS, clamp } from './rules.js'
import { toyPortrait } from './art.js'
const LEGACY_DEFAULT_NAMES = new Set(['Mèo Crookshanks', 'Gấu Mật', 'Thỏ Mơ', 'Mèo Sữa'])
const PET_REACTIONS = {
  head: [
    { bubble: 'Gừm~ xoa đầu êm quá! 💖', msg: name => `👋 Bạn xoa đầu ${name} thật nhẹ nhàng — bạn nhỏ lim dim mắt hưởng thụ! 💖`, icon: '💖' },
    { bubble: 'Thích được vuốt ve lắm! ✨', msg: name => `👋 Bạn vuốt dọc sống lưng ${name} — bộ lông mềm mượt rung rinh thích thú! ✨`, icon: '✨' },
  ],
  cheek: [
    { bubble: 'Nựng má sướng ghê~ 🥰', msg: name => `🥰 Bạn nựng hai má phúng phính của ${name} — bạn nhỏ dụi đầu vào tay bạn! 💕`, icon: '🥰' },
    { bubble: 'Gãi cằm nữa đi bạn ơi~ 🌸', msg: name => `🥰 Bạn gãi nhẹ dưới cằm ${name} — bạn nhỏ phát ra tiếng kêu rừ rừ hạnh phúc! 🌸`, icon: '💕' },
  ],
  belly: [
    { bubble: 'Nhột quá hihi! 🐾✨', msg: name => `✨ Bạn cù nhẹ vào bụng ${name} — bạn nhỏ lăn tròn cười khúc khích! 🐾`, icon: '🐾' },
    { bubble: 'Ôm một cái thật chặt! 💖', msg: name => `🤗 Bạn ôm ${name} vào lòng — trái tim nhỏ đập rộn ràng đầy yêu thương! 💖`, icon: '💖' },
  ]
}
export const GROW_CARE_THRESHOLD = 3

export function loadPets(storage, collection) {
  const fallback = { pets: [], active: null }
  try {
    const raw = JSON.parse(storage.getItem('momo-pets.v1'))
    if (!Array.isArray(raw?.pets)) return fallback
    const byKind = new Map(), ids = new Set()
    for (const p of raw.pets) {
      if (!p || !Object.hasOwn(TYPES, p.kind) || typeof p.id !== 'string' || ids.has(p.id)) continue
      ids.add(p.id)
      if ((collection[p.kind] || 0) < 1) continue
      const rawName = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 24) : TYPES[p.kind].name
      const clean = {
        id: p.id,
        kind: p.kind,
        name: LEGACY_DEFAULT_NAMES.has(rawName) ? TYPES[p.kind].name : rawName,
        food: Number.isFinite(p.food) ? clamp(p.food, 0, 100) : 65,
        joy: Number.isFinite(p.joy) ? clamp(p.joy, 0, 100) : 65,
        energy: Number.isFinite(p.energy) ? clamp(p.energy, 0, 100) : 75,
        care: Number.isSafeInteger(p.care) ? clamp(p.care, 0, 100000) : 0,
      }
      const existing = byKind.get(p.kind)
      if (!existing) {
        byKind.set(p.kind, clean)
      } else if (clean.care > existing.care) {
        existing.care = clean.care
        existing.food = Math.max(existing.food, clean.food)
        existing.joy = Math.max(existing.joy, clean.joy)
        existing.energy = Math.max(existing.energy, clean.energy)
      }
    }
    const pets = Array.from(byKind.values())
    return { pets, active: pets.some(p => p.id === raw.active) ? raw.active : pets[0]?.id || null }
  } catch { return fallback }
}
export function createPetHome({ storage, getCollection, goArcade, onUpdateCollection }) {
  const el = s => document.querySelector(s)
  const state = loadPets(storage, getCollection())
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')
  let activity = null, remaining = 0, saveClock = 0, renderedKind = null, previewPet = null
  let roamX = 0, roamY = 0, targetX = 35, targetY = 6, pauseTimer = 0.8, facing = 1, pettedTimer = 0, cuddleMode = 'petted', playTime = 0, napTimer = 0
  let bubbleTimer = 0, reactIdx = 0, strokeAccum = 0, lastStrokeX = null, lastStrokeY = null, lastStrokeAt = 0
  const active = () => previewPet || state.pets.find(p => p.id === state.active)
  const save = () => { try { storage.setItem('momo-pets.v1', JSON.stringify(state)) } catch { el('#pet-message').textContent = 'Trình duyệt chưa cho lưu. Tiến trình hiện vẫn giữ trong phiên này.' } }
  if (!isJsdom) {
    try {
      if (!storage.getItem('momo-pets.baby-migrated.v1')) {
        state.pets.forEach(p => { p.care = 0 })
        storage.setItem('momo-pets.baby-migrated.v1', '1')
        save()
      }
    } catch {}
  }
  const message = text => { el('#pet-message').textContent = text }
  function showPetBubble(text, duration = 2.0) {
    const homePet = el('#home-pet')
    if (!homePet) return
    let b = homePet.querySelector('.pet-bubble')
    if (!b) {
      b = document.createElement('span')
      b.className = 'pet-bubble'
      homePet.append(b)
    }
    b.textContent = text
    b.hidden = false
    bubbleTimer = duration
  }
  function spawnHeartBurst(clientX, clientY, icon = '💖') {
    const fxLayer = el('#pet-fx')
    const roomEl = document.querySelector('.pet-room')
    if (!fxLayer || !roomEl) return
    const rect = roomEl.getBoundingClientRect()
    const baseX = clientX && rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 50 + (roamX / 260) * 100
    const baseY = clientY && rect.height > 0 ? ((clientY - rect.top) / rect.height) * 100 : 62 + (roamY / 90) * 100
    const icons = [icon, '💖', '✨', '💕']
    for (let i = 0; i < 3; i++) {
      const node = document.createElement('span')
      node.className = 'pet-heart-pop'
      node.textContent = icons[i % icons.length]
      node.style.left = `${clamp(baseX + (Math.random() - 0.5) * 10, 8, 92)}%`
      node.style.top = `${clamp(baseY + (Math.random() - 0.5) * 8, 12, 85)}%`
      node.style.setProperty('--dx', `${((Math.random() - 0.5) * 36).toFixed(1)}px`)
      fxLayer.append(node)
      setTimeout(() => node.remove(), 950)
    }
  }
  function syncPetTransform(isWalking = false) {
    const homePet = el('#home-pet')
    if (!homePet) return
    homePet.classList.toggle('walking', isWalking && !activity)
    homePet.classList.toggle('napping', napTimer > 0 && !activity && !isWalking && pettedTimer <= 0)
    homePet.classList.toggle('petted', pettedTimer > 0 && !activity && cuddleMode === 'petted')
    homePet.classList.toggle('cuddle', pettedTimer > 0 && !activity && cuddleMode === 'cuddle')
    homePet.classList.toggle('tickle', pettedTimer > 0 && !activity && cuddleMode === 'tickle')
    homePet.style.setProperty('--roam-x', `${roamX.toFixed(1)}px`)
    homePet.style.setProperty('--roam-y', `${roamY.toFixed(1)}px`)
    homePet.style.setProperty('--pet-dir', String(facing))
  }
  function interactWithPet(zone = 'head', clientX = null, clientY = null) {
    const pet = active()
    if (!pet || activity) return
    napTimer = 0
    const pool = PET_REACTIONS[zone] || PET_REACTIONS.head
    const item = pool[reactIdx++ % pool.length]
    cuddleMode = zone === 'cheek' ? 'cuddle' : zone === 'belly' ? 'tickle' : 'petted'
    pettedTimer = 1.45
    pauseTimer = Math.max(pauseTimer, 1.5)
    pet.joy = Math.min(100, pet.joy + 4)
    showPetBubble(item.bubble, 2.1)
    spawnHeartBurst(clientX, clientY, item.icon)
    for (const key of ['food', 'joy', 'energy']) {
      el(`#pet-${key}`).value = pet[key] || 0
      el(`#pet-${key}-value`).textContent = Math.round(pet[key] || 0)
    }
    syncPetTransform(false)
    message(item.msg(pet.name))
  }
  function render() {
    const pet = active()
    const care = pet?.care || 0
    const isAdult = care >= GROW_CARE_THRESHOLD
    const stage = isAdult ? 'adult' : 'baby'
    const renderKey = pet ? `${pet.kind}:${stage}` : null
    el('#pet-empty').hidden = !!pet; el('#pet-details').hidden = !pet
    if (!pet) {
      el('#home-pet').innerHTML = ''
      renderedKind = null
    } else if (renderedKind !== renderKey || !el('#home-pet').innerHTML) {
      el('#home-pet').innerHTML = `${toyPortrait(pet.kind, stage, true)}<span class="pet-bubble" hidden></span>`
      renderedKind = renderKey
    }
    el('#home-pet').className = `home-pet stage-${stage} ${activity || ''}`
    syncPetTransform(false)
    el('#pet-name').textContent = pet?.name || 'Một mái nhà đang chờ bạn'
    if (document.activeElement !== el('#rename-input')) el('#rename-input').value = pet?.name || ''
    for (const key of ['food', 'joy', 'energy']) {
      el(`#pet-${key}`).value = pet?.[key] || 0
      el(`#pet-${key}-value`).textContent = Math.round(pet?.[key] || 0)
    }
    el('#friendship').textContent = !isAdult
      ? `🐣 Đang là Bé Con (${care}/${GROW_CARE_THRESHOLD} lần chăm để lớn khôn) · Chậu cây ở mốc 3`
      : `🌟 Đã Trưởng Thành (${care} lần chăm sóc) · ${care < 7 ? 'Dây sao ở mốc 7' : 'Căn phòng đã đầy yêu thương'}`
    el('#room-plant').hidden = care < 3; el('#room-stars').hidden = care < 7
    document.querySelectorAll('[data-care]').forEach(b => { b.disabled = !pet || !!activity })
    const petBtn = el('#player-pet-btn'), cuddleBtn = el('#player-cuddle-btn')
    if (petBtn) petBtn.disabled = !pet || !!activity
    if (cuddleBtn) cuddleBtn.disabled = !pet || !!activity
    el('#pet-roster').replaceChildren()
    state.pets.forEach(p => {
      const pAdult = (p.care || 0) >= GROW_CARE_THRESHOLD
      const b = document.createElement('button'); b.className = `pet-roster-item ${!previewPet && p.id === state.active ? 'selected' : ''}`
      b.textContent = `${!previewPet && p.id === state.active ? '♥' : '♡'} ${pAdult ? '🌟' : '🐣'} ${p.name}`; b.disabled = !!activity
      b.onclick = () => { previewPet = null; state.active = p.id; roamX = 0; roamY = 0; save(); render(); message('Bạn nhỏ đã sẵn sàng chơi cùng bạn.') }
      el('#pet-roster').append(b)
    })
    const entries = Object.entries(TYPES)
    const orderedEntries = [
      ...entries.filter(([k]) => !ORIGINAL_8_KINDS.has(k)),
      ...entries.filter(([k]) => ORIGINAL_8_KINDS.has(k))
    ]
    el('#pet-adoptions').innerHTML = orderedEntries.map(([kind, t], i) => {
      const alreadyInTent = state.pets.some(p => p.kind === kind)
      const canAdopt = (getCollection()[kind] || 0) > 0 && !alreadyInTent
      const isNew = !ORIGINAL_8_KINDS.has(kind)
      const imgAttrs = i > 5 ? 'loading="lazy"' : ''
      return `<div class="adopt-card ${isNew ? 'is-new-beast' : ''}"><div class="adopt-thumbs"><img src="/beasts/${kind}_baby.png" alt="${t.name} Bé" width="38" height="38" ${imgAttrs}><img src="/beasts/${kind}.png" alt="${t.name} Lớn" width="38" height="38" ${imgAttrs}></div><button data-adopt="${kind}" ${!canAdopt || activity ? 'disabled' : ''}>${isNew ? '✦ ' : ''}${t.name}<span>${alreadyInTent ? 'Đã có trong lều ♡' : canAdopt ? 'Nhận nuôi bé con 🐣' : 'Gắp thêm để nhận nuôi'}</span></button><button type="button" class="pet-preview-btn" data-preview="${kind}" title="Xem thử Bé Con & Trưởng Thành trong lều">👁 Xem</button></div>`
    }).join('')
  }
  const homePetEl = el('#home-pet')
  if (homePetEl) {
    homePetEl.onclick = e => {
      e.stopPropagation()
      const pet = active()
      if (!pet || activity) return
      const rect = homePetEl.getBoundingClientRect()
      let zone = 'head'
      if (rect.height > 0) {
        const relY = (e.clientY - rect.top) / rect.height
        if (relY > 0.68) zone = 'belly'
        else if (relY > 0.38) zone = 'cheek'
      }
      interactWithPet(zone, e.clientX, e.clientY)
    }
    // Rubbing / stroking mouse or finger across the pet (supports iOS 16+ touch & mouse)
    homePetEl.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') homePetEl.setPointerCapture?.(e.pointerId)
      lastStrokeX = e.clientX
      lastStrokeY = e.clientY
    })
    homePetEl.addEventListener('pointermove', e => {
      const pet = active()
      if (!pet || activity) return
      const now = performance.now()
      if (lastStrokeX !== null && lastStrokeY !== null) {
        strokeAccum += Math.hypot(e.clientX - lastStrokeX, e.clientY - lastStrokeY)
      }
      lastStrokeX = e.clientX
      lastStrokeY = e.clientY
      if (strokeAccum > 64 && now - lastStrokeAt > 420) {
        strokeAccum = 0
        lastStrokeAt = now
        interactWithPet('cheek', e.clientX, e.clientY)
      }
    })
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      homePetEl.addEventListener(ev, () => {
        strokeAccum = 0
        lastStrokeX = null
        lastStrokeY = null
      })
    }
  }
  const petBtnEl = el('#player-pet-btn')
  if (petBtnEl) {
    petBtnEl.onclick = () => interactWithPet('head')
  }
  const cuddleBtnEl = el('#player-cuddle-btn')
  if (cuddleBtnEl) {
    cuddleBtnEl.onclick = () => interactWithPet('cheek')
  }
  const roomEl = document.querySelector('.pet-room')
  if (roomEl) {
    roomEl.onclick = e => {
      const pet = active()
      if (!pet || activity || e.target.closest('#pet-empty') || e.target.closest('#home-pet')) return
      const rect = roomEl.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const relX = (e.clientX - rect.left) / rect.width - 0.5
        const relY = (e.clientY - rect.top) / rect.height - 0.72
        targetX = clamp(relX * 260, -110, 110)
        targetY = clamp(relY * 90, -18, 16)
        pauseTimer = 0
        napTimer = 0
        showPetBubble('Đợi mình chạy tới nè! 🐾', 1.5)
        message(`${pet.name} đang lon ton chạy tới chỗ bạn gọi! 🐾`)
      }
    }
  }
  el('#pet-adoptions').onclick = e => {
    const previewKind = e.target.closest('[data-preview]')?.dataset.preview
    if (previewKind && !activity && TYPES[previewKind]) {
      const nextAdult = previewPet?.kind === previewKind && (previewPet.care || 0) < GROW_CARE_THRESHOLD
      previewPet = {
        id: `preview-${previewKind}`,
        kind: previewKind,
        name: TYPES[previewKind].name,
        food: 85,
        joy: 90,
        energy: 85,
        care: nextAdult ? GROW_CARE_THRESHOLD : 0
      }
      roamX = 0; roamY = 0; pauseTimer = 0.2; render()
      message(`👁 Đang xem thử ${TYPES[previewKind].name} ở dạng ${nextAdult ? '🌟 Trưởng Thành' : '🐣 Bé Con'} (bấm "👁 Xem" lần nữa để đổi Bé ↔ Lớn)!`)
      return
    }
    const kind = e.target.closest('[data-adopt]')?.dataset.adopt
    if (!kind || activity || state.pets.some(p => p.kind === kind) || (getCollection()[kind] || 0) <= 0) return
    previewPet = null
    const pet = { id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, name: TYPES[kind].name, food: 65, joy: 65, energy: 75, care: 0 }
    state.pets.push(pet); state.active = pet.id; roamX = 0; roamY = 0; save(); render(); message('Chào mừng bạn nhỏ! Đặt một cái tên thật thân thương nhé.')
  }
  el('#rename-form').onsubmit = e => {
    e.preventDefault(); const pet = active(), name = el('#rename-input').value.trim().slice(0, 24)
    if (!pet || !name) return
    pet.name = name; save(); render(); message('Đã lưu tên mới của bạn nhỏ.')
  }
  const settings = { feed: { key: 'food', amount: 28, duration: 2, text: 'Măm măm… ngon quá!' }, play: { key: 'joy', amount: 25, duration: 3, text: 'Lăn bóng qua đây nào!' }, sleep: { key: 'energy', amount: 35, duration: 5, text: 'Suỵt… bạn nhỏ đang ngủ.' } }
  document.querySelectorAll('[data-care]').forEach(b => { b.onclick = () => {
    const pet = active(), next = b.dataset.care, setting = settings[next]
    if (!pet || activity) return
    if (pet[setting.key] > 90) { message('Bạn nhỏ đã đủ rồi. Thử một hoạt động khác nhé!'); return }
    if (next === 'play' && pet.energy < 15) { message('Bạn nhỏ buồn ngủ rồi, cho bạn nghỉ một chút nhé.'); return }
    activity = next; remaining = setting.duration; playTime = 0; napTimer = 0
    if (next === 'feed') { roamX = 0; roamY = 4; facing = 1 }
    render()
    if (next === 'sleep') showPetBubble('Khò khò… mơ đẹp quá~ ☾', setting.duration)
    message(setting.text)
  } })
  el('#pet-back').onclick = goArcade; el('#pet-find').onclick = goArcade
  render()
  return {
    refresh: render,
    tick(dt) {
      const pet = active(); if (!pet) return
      saveClock += dt
      if (pettedTimer > 0) {
        pettedTimer = Math.max(0, pettedTimer - dt)
        if (pettedTimer <= 0) syncPetTransform(false)
      }
      if (napTimer > 0) {
        napTimer = Math.max(0, napTimer - dt)
        if (napTimer <= 0) syncPetTransform(false)
      }
      if (bubbleTimer > 0) {
        bubbleTimer = Math.max(0, bubbleTimer - dt)
        if (bubbleTimer <= 0) {
          const b = el('#home-pet .pet-bubble')
          if (b) b.hidden = true
        }
      }
      if (activity) {
        remaining -= dt
        playTime += dt
        if (activity === 'play') {
          const prevX = roamX
          roamX = Math.sin(playTime * 4.2) * 58
          roamY = Math.cos(playTime * 8.4) * 6
          if (Math.abs(roamX - prevX) > 0.1) facing = roamX >= prevX ? 1 : -1
          syncPetTransform(true)
        }
        if (remaining <= 0) {
          const finishedActivity = activity
          const setting = settings[finishedActivity]; pet[setting.key] = Math.min(100, pet[setting.key] + setting.amount)
          if (finishedActivity === 'play') { pet.energy = Math.max(0, pet.energy - 12); pet.food = Math.max(0, pet.food - 8) }
          if (finishedActivity === 'sleep') {
            pet.food = Math.max(0, pet.food - 5)
            napTimer = 3.6
            pauseTimer = 3.8
          }
          pet.care++; activity = null; save(); render(); onUpdateCollection?.()
          if (finishedActivity === 'sleep') showPetBubble('Khò… zzz~ ☾', 2.6)
          message(pet.care === GROW_CARE_THRESHOLD ? `✨ Kỳ diệu quá! ${pet.name} đã lớn khôn thành hình dạng Trưởng Thành và mở khóa chậu cây mới!` : pet.care === 7 ? 'Dây sao đã làm căn phòng lung linh hơn!' : 'Bạn nhỏ vui lắm! Cảm ơn bạn đã chăm sóc.');
        }
      } else {
        pet.food = Math.max(0, pet.food - dt * .06); pet.joy = Math.max(0, pet.joy - dt * .035); pet.energy = Math.max(0, pet.energy - dt * .025)
        // Autonomous room roaming
        if (pauseTimer > 0) {
          pauseTimer -= dt
          syncPetTransform(false)
          if (pauseTimer <= 0) {
            targetX = (Math.random() - 0.5) * 195
            targetY = (Math.random() - 0.5) * 28
          }
        } else {
          const dx = targetX - roamX, dy = targetY - roamY
          const dist = Math.hypot(dx, dy)
          if (dist < 2.5) {
            if (pet.energy < 48 && Math.random() < 0.45) {
              napTimer = 2.8
              pauseTimer = 3.0
              showPetBubble('Ngáp~ buồn ngủ quá… ☾', 2.2)
            } else {
              pauseTimer = 0.55 + Math.random() * 0.85
            }
            syncPetTransform(false)
          } else {
            const speed = 46 * dt
            const step = Math.min(dist, speed)
            roamX += (dx / dist) * step
            roamY += (dy / dist) * step
            if (Math.abs(dx) > 1) facing = dx >= 0 ? 1 : -1
            syncPetTransform(true)
          }
        }
      }
      if (saveClock >= 10) { saveClock = 0; save(); render() }
    },
    save,
    isGrown(kind) {
      return state.pets.some(p => p.kind === kind && (p.care || 0) >= GROW_CARE_THRESHOLD)
    },
    preview(kind, stage = 'baby') {
      if (!TYPES[kind]) return
      previewPet = {
        id: `preview-${kind}`,
        kind,
        name: TYPES[kind].name,
        food: 88,
        joy: 92,
        energy: 86,
        care: stage === 'adult' ? GROW_CARE_THRESHOLD : 0
      }
      roamX = 0; roamY = 0; pauseTimer = 0.15; render()
      message(`👁 Đang xem thử ${TYPES[kind].name} ở dạng ${stage === 'adult' ? '🌟 Trưởng Thành' : '🐣 Bé Con'} trong Lều Bác Hagrid!`)
    },
  }
}
