import { createPetHome } from './pets.js'
import './style.css'
import { toyPortrait } from './art.js'
import { makeWorld } from './scene.js'
import { TYPES, ORIGINAL_8_KINDS, clamp, ease, lerp, findCatch, inPrizeChute, loadCollection, saveCollection } from './rules.js'
import { HpvnBridge } from './hpvnBridge.js'
import { ClawArcadeBackend } from './backend.js'

const $ = selector => document.querySelector(selector)
let storage
try { storage = localStorage } catch { storage = { getItem: () => null, setItem: () => {} } }
let collection = loadCollection(storage)
let galleons = 0
try {
  const savedGals = Number.parseInt(storage.getItem('momo-claw.gals.v1'), 10)
  if (Number.isSafeInteger(savedGals) && savedGals > 0) galleons = savedGals
} catch {}

const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')
let bridge = null
let backend = null

function showMagicToast({ icon = '✨', title, body, houseColor }) {
  if (isJsdom) return
  const container = $('#magic-toast-container')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = 'magic-toast'
  if (houseColor) toast.style.borderLeftColor = houseColor
  toast.innerHTML = `<span class="toast-icon">${icon}</span><div><strong>${title}</strong><p>${body}</p></div>`
  container.appendChild(toast)
  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 400)
  }, 4500)
}

if (!isJsdom) {
  try {
    bridge = new HpvnBridge(storage)
    const meta = bridge.getHouseMeta(bridge.identity.house)
    const badgeEl = $('#wizard-badge')
    const nameEl = $('#wizard-name')
    if (badgeEl) badgeEl.textContent = meta.badge
    if (nameEl) nameEl.textContent = bridge.identity.name

    backend = new ClawArcadeBackend({
      identity: bridge.identity,
      storage,
      onPresenceChange: (count) => {
        const countEl = $('#online-count')
        if (countEl) countEl.textContent = Math.max(1, count)
      },
      onBroadcastMessage: (msg) => {
        if (msg.type === 'BEAST_CAUGHT') {
          const houseMeta = bridge.getHouseMeta(msg.house)
          showMagicToast({
            icon: '🐣',
            title: `${houseMeta.badge} ${msg.wizardName} (${houseMeta.name})`,
            body: `Vừa gắp được một bạn nhỏ ${msg.beastName}!`,
            houseColor: houseMeta.color,
          })
        } else if (msg.type === 'CHEST_OPENED') {
          const houseMeta = bridge.getHouseMeta(msg.house)
          showMagicToast({
            icon: '🪙',
            title: `${houseMeta.badge} ${msg.wizardName} (${houseMeta.name})`,
            body: `Mở Rương Gringotts nhận được +${msg.amount} Galleons!`,
            houseColor: '#f59e0b',
          })
        }
      },
      onSyncComplete: (merged) => {
        if (merged && Number.isSafeInteger(merged.galleons)) {
          galleons = Math.max(galleons, merged.galleons)
          updateCollection()
        }
      }
    })
  } catch (err) {
    console.warn('[Backend Main] Init error:', err)
  }
}

let phase = 'welcome', paused = false, elapsed = 0, timeLeft = 20, toys = [], held = null, targetY = .4, start = {}, success = false, lastTime = 0, audioEnabled = false, audioContext = null
const hook = { x: 0, y: 1.65, close: 0, aim: true }
const keys = new Set(), joystick = { x: 0 }, durations = { lower: 1.25, close: .65, lift: 1.3, deliver: 1.7, drop: 1.25, home: 1.1 }
let currentView = 'arcade', activeFilter = 'all'
const petHome = createPetHome({ storage, getCollection: () => collection, goArcade: () => switchView('arcade'), onUpdateCollection: () => updateCollection() })
const VIEW_MAP = {
  arcade: { panel: '#arcade-view', tab: '#arcade-tab' },
  home: { panel: '#pet-view', tab: '#home-tab' },
  collection: { panel: '#collection-view', tab: '#collection-link' }
}
function switchView(view) {
  if (!VIEW_MAP[view]) view = 'arcade'
  if (view !== 'arcade') pauseGame()
  keys.clear(); joystick.x = 0; currentView = view
  for (const [name, cfg] of Object.entries(VIEW_MAP)) {
    const isActive = name === view
    const panelEl = $(cfg.panel)
    const tabEl = $(cfg.tab)
    if (panelEl) {
      panelEl.hidden = !isActive
      panelEl.classList.toggle('inactive', !isActive)
      panelEl.setAttribute('aria-hidden', String(!isActive))
    }
    if (tabEl) {
      tabEl.classList.toggle('nav-active', isActive)
      tabEl.setAttribute('aria-pressed', String(isActive))
    }
  }
  petHome.save(); petHome.refresh()
  if (view === 'collection') updateCollection()
  const targetTab = $(VIEW_MAP[view].tab)
  targetTab?.focus({ preventScroll: true })
}
$('#arcade-tab').onclick = () => switchView('arcade')
$('#home-tab').onclick = () => switchView('home')
$('#collection-link').onclick = () => switchView('collection')
$('#dialog-home').onclick = () => switchView('home')
window.addEventListener('pagehide', () => petHome.save())
let world
function tone(frequency, length = .12, offset = 0) {
  if (!audioEnabled) return
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    audioContext ||= new AC(); void audioContext.resume()
    const osc = audioContext.createOscillator(), gain = audioContext.createGain(), at = audioContext.currentTime + offset
    osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(.035, at); gain.gain.exponentialRampToValueAtTime(.001, at + length); osc.connect(gain).connect(audioContext.destination); osc.start(at); osc.stop(at + length)
  } catch { audioEnabled = false }
}
function updateCollection() {
  const entries = Object.entries(TYPES)
  const orderedEntries = [
    ...entries.filter(([k]) => !ORIGINAL_8_KINDS.has(k)),
    ...entries.filter(([k]) => ORIGINAL_8_KINDS.has(k))
  ].filter(([kind]) => {
    if (activeFilter === 'new') return !ORIGINAL_8_KINDS.has(kind)
    if (activeFilter === 'classic') return ORIGINAL_8_KINDS.has(kind)
    if (activeFilter === 'owned') return (collection[kind] || 0) > 0
    return true
  })
  $('#prize-cards').innerHTML = orderedEntries.map(([kind, t], i) => {
    const owned = collection[kind] || 0
    const grown = petHome?.isGrown?.(kind)
    const isNew = !ORIGINAL_8_KINDS.has(kind)
    const num = String(i + 1).padStart(2, '0')
    const imgAttrs = i < 4 ? 'fetchpriority="high"' : i > 8 ? 'loading="lazy"' : ''
    return `<article class="prize-card ${owned ? 'owned' : ''} ${isNew ? 'is-new-beast' : ''}" data-kind="${kind}"><div class="prize-card-top"><span class="prize-number">#${num}</span><span class="prize-tag">${isNew ? '✦ THÚ MỚI · ' : ''}${t.tag}</span><span class="prize-check">${owned ? '✓ Đã có' : '♡'}</span></div><h3>${t.name}</h3><div class="prize-art prize-art-dual"><div class="stage-thumb"><img src="/beasts/${kind}_baby.png" alt="${t.name} Bé Con" width="76" height="76" ${imgAttrs}><span>🐣 Bé Con</span></div><div class="stage-arrow">→</div><div class="stage-thumb"><img src="/beasts/${kind}.png" alt="${t.name} Trưởng Thành" width="76" height="76" ${imgAttrs}><span>🌟 Trưởng Thành</span></div></div><div class="prize-info"><span class="prize-owned">${owned ? (grown ? `Đã lớn khôn 🌟 (Đang sở hữu: ${owned})` : `Đang là Bé Con 🐣 (Đang sở hữu: ${owned})`) : 'Chưa gắp trúng · Hãy gắp hộp Sô-cô-la Ếch để sưu tầm!'}</span></div></article>`
  }).join('')
  $('#collection-count').textContent = `${entries.filter(([k]) => (collection[k] || 0) > 0).length} / ${entries.length}`
  $('#nav-count').textContent = Object.values(collection).reduce((a, b) => a + b, 0)
  const galsEl = $('#gals-count')
  if (galsEl) galsEl.textContent = galleons.toLocaleString('vi-VN')
}
document.querySelector('.collection-filters')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-filter]')
  if (!btn) return
  activeFilter = btn.dataset.filter || 'all'
  document.querySelectorAll('.collection-filters .filter-pill').forEach(b => b.classList.toggle('active', b === btn))
  updateCollection()
})
function setStatus(text) { $('#status').textContent = text }
function transition(next) {
  phase = next; elapsed = 0
  start = { x: hook.x, y: hook.y }
  $('#grab').disabled = phase !== 'aim' || paused
  $('#refill').disabled = !['welcome', 'aim', 'result'].includes(phase)
  $('#pause').hidden = ['welcome', 'result', 'error'].includes(phase)
  hook.aim = phase === 'aim' || phase === 'welcome'
}
function dialog({ icon = '✿', eyebrow, title, body, action, run, unboxStage = false }) {
  $('#dialog-home').hidden = true
  $('#overlay').classList.toggle('unbox-stage', Boolean(unboxStage))
  $('#dialog-icon').textContent = icon; $('#dialog-eyebrow').textContent = eyebrow; $('#dialog-title').innerHTML = title; $('#dialog-body').textContent = body; $('#dialog-action').innerHTML = `${action} <span>→</span>`; $('#dialog-action').onclick = run; $('#overlay').hidden = false
  $('#dialog-action').focus({ preventScroll: true })
}
const BOX_MYSTERIES = [
  // === NHÓM HỘP BẪY "LÊU LÊU!" (TỶ LỆ CAO NHẤT: 62% TỔNG TRỌNG SỐ) ===
  {
    weight: 20,
    isZonk: true,
    prizeId: 'leuleu_frog',
    icon: '😝',
    badge: '😝 LÊU LÊU! ẾCH TRỐN MẤT!',
    eyebrow: 'HỘP SÔ-CÔ-LA ẾCH BỊ LÊU LÊU!',
    title: 'Lêu lêu! Ếch nhảy trốn mất rồi! 😜',
    body: 'Bạn gắp trúng hộp 100%, nhưng vừa hé nắp thì chú Ếch Sô-cô-la đã bật lò xo nhảy vọt qua cửa sổ trốn mất, chỉ để lại mảnh giấy ghi: "LÊU LÊU BẠN NHÉ! 😝"'
  },
  {
    weight: 18,
    isZonk: true,
    prizeId: 'leuleu_weasley',
    icon: '🤡',
    badge: '🤡 LÊU LÊU! BẪY WEASLEY!',
    eyebrow: 'TIỆM PHÙ THỦY QUỶ QUÁI WEASLEY',
    title: 'Lêu lêu! Hộp bẫy trêu ngươi! 🤪',
    body: 'Lêu lêu! Bạn gắp trúng hộp bẫy của hai anh em Fred & George Weasley! Một chiếc lưỡi lò xo bật ra kêu "Lêu lêu!" rồi phụt khói tím!'
  },
  {
    weight: 14,
    isZonk: true,
    prizeId: 'leuleu_peeves',
    icon: '👻',
    badge: '👻 LÊU LÊU! PEEVES TRÁO HỘP!',
    eyebrow: 'TRÒ ĐÙA CỦA YÊU TINH PEEVES',
    title: 'Lêu lêu! Yêu tinh Peeves ăn vụng rồi! 😝',
    body: 'Yêu tinh Peeves đã lẻn vào tủ kính ăn sạch sô-cô-la và để lại chiếc lò xo thè lưỡi trêu ngươi bạn: "LÊU LÊU! THỬ LẠI ĐI NHÉ!"'
  },
  {
    weight: 10,
    isZonk: true,
    prizeId: 'leuleu_wrapper',
    icon: '💨',
    badge: '💨 LÊU LÊU! HỘP RỖNG KHÔNG!',
    eyebrow: 'BÙA ẨN THÂN QUÁ ĐÀ',
    title: 'Lêu lêu! Quà đã độn thổ mất tiêu! 😜',
    body: 'Chiếc hộp vừa bật nắp chỉ phả ra một làn khói tím kèm tấm biển lò xo lắc lư chữ "LÊU LÊU! CHÚC BẠN MAY MẮN LẦN SAU!"'
  },

  // === NHÓM RƯƠNG TIỀN GRINGOTTS (18% TỔNG TRỌNG SỐ · ĐỘ KHÓ CAO CHO MỨC 300-500 GALS) ===
  {
    weight: 11,
    isZonk: false,
    isChest: true,
    prizeId: 'galleon_chest',
    minGals: 10,
    maxGals: 500,
    rarityPower: 2.6,
    icon: '🪙',
    eyebrow: 'KHO BÁU NGÂN HÀNG PHÙ THỦY GRINGOTTS',
    title: 'Mở Trúng Rương Vàng Gringotts!'
  },
  {
    weight: 5,
    isZonk: false,
    isChest: true,
    prizeId: 'galleon_vault',
    minGals: 10,
    maxGals: 500,
    rarityPower: 1.8,
    icon: '💰',
    eyebrow: 'HẦM NGÂN KHỐ YÊU TINH GRINGOTTS',
    title: 'Mở Trúng Rương Kho Báu Galleon!'
  },
  {
    weight: 2,
    isZonk: false,
    isChest: true,
    prizeId: 'galleon_jackpot',
    minGals: 10,
    maxGals: 500,
    rarityPower: 1.15,
    icon: '👑',
    eyebrow: 'KÉT SẮT CỔ ĐẠI NGÂN HÀNG GRINGOTTS',
    title: 'Mở Trúng Rương Vàng Cổ Đại!'
  },

  // === NHÓM 28 SINH VẬT HUYỀN BÍ (20% TỔNG TRỌNG SỐ · PHÂN BẬC ĐỘ HIẾM M.O.M XX -> XXXXX) ===
  {
    weight: 1.2,
    isZonk: false,
    prizeId: 'bowtruckle',
    kind: 'bowtruckle',
    icon: '🌿',
    badge: '🌿 BOWTRUCKLE PICKETT · M.O.M XX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Mộc Tinh Bowtruckle Pickett!',
    body: 'Vệ thần giữ cây lấy gỗ đũa phép với thân cành non xanh biếc và hai chiếc lá trên đỉnh đầu đã về với Lều Bác Hagrid!'
  },
  {
    weight: 1.2,
    isZonk: false,
    prizeId: 'puffskein',
    kind: 'puffskein',
    icon: '🌸',
    badge: '🌸 PUFFSKEIN BÔNG THOA · M.O.M XX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Cầu Bông Puffskein (Pygmy Puff)!',
    body: 'Quả cầu lông hồng tím tròn xoe mềm mượt phát ra tiếng ngân nga dễ thương với chiếc lưỡi hồng siêu dài!'
  },
  {
    weight: 1.2,
    isZonk: false,
    prizeId: 'dumbledore',
    kind: 'rabbit',
    icon: '🦉',
    badge: '🦉 CÚ TUYẾT HEDWIG & THẺ DUMBLEDORE',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Cú Tuyết Hedwig & Thẻ Vàng!',
    body: 'Hộp Sô-cô-la Ếch mở ra Cú Tuyết Hedwig ngậm thư Hogwarts kèm Thẻ Phù Thủy Ngũ Giác Albus Dumbledore!'
  },
  {
    weight: 1.15,
    isZonk: false,
    prizeId: 'mooncalf',
    kind: 'mooncalf',
    icon: '🌙',
    badge: '🌙 NGUYỆT NGƯU MOONCALF · M.O.M XX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Nguyệt Ngưu Mooncalf!',
    body: 'Sinh vật nhút nhát có đôi mắt xanh ngọc trai khổng lồ thường nhảy múa dưới ánh trăng tròn đã về với Lều Bác Hagrid!'
  },
  {
    weight: 1.15,
    isZonk: false,
    prizeId: 'augurey',
    kind: 'augurey',
    icon: '🌧️',
    badge: '🌧️ ĐIỂU BÁO MƯA AUGUREY · M.O.M XX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Điểu Báo Mưa Augurey!',
    body: 'Phượng hoàng Ailen với bộ lông xanh lục bảo trầm mặc và tiếng hót báo hiệu những cơn mưa phép thuật!'
  },
  {
    weight: 1.15,
    isZonk: false,
    prizeId: 'diricawl',
    kind: 'diricawl',
    icon: '🪶',
    badge: '🪶 ĐIỂU ĐỘN THỔ DIRICAWL · M.O.M XX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Điểu Độn Thổ Diricawl!',
    body: 'Loài chim mũm mĩm lông tím oải hương có khả năng tự độn thổ biến mất trong làn lông vũ lấp lánh!'
  },
  {
    weight: 0.95,
    isZonk: false,
    prizeId: 'niffler',
    kind: 'bear',
    icon: '🪙',
    badge: '🪙 NIFFLER ĐÀO VÀNG · M.O.M XXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Niffler Đào Vàng!',
    body: 'Chú Niffler lông đen mượt như nhung với chiếc mỏ vịt dẹp đang ôm chặt đồng vàng Galleon và hồng ngọc lấp lánh!'
  },
  {
    weight: 0.95,
    isZonk: false,
    prizeId: 'felix',
    kind: 'cat',
    icon: '🐱',
    badge: '🐱 KNEAZLE CROOKSHANKS · M.O.M XXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Linh Miêu Kneazle Crookshanks!',
    body: 'Chú mèo phép thuật lai Kneazle lông cam xù dày, tai linh miêu thông thái kèm lọ thuốc may mắn Felix Felicis!'
  },
  {
    weight: 0.9,
    isZonk: false,
    prizeId: 'hippogriff',
    kind: 'hippogriff',
    icon: '🦅',
    badge: '🦅 BẰNG MÃ BUCKBEAK · M.O.M XXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Bằng Mã Buckbeak!',
    body: 'Sinh vật nửa đại bàng nửa chiến mã vô cùng kiêu hãnh và trung thành của bác Hagrid đã về với lều bảo tồn!'
  },
  {
    weight: 0.9,
    isZonk: false,
    prizeId: 'fwooper',
    kind: 'fwooper',
    icon: '🌺',
    badge: '🌺 ĐIỂU KHÚC CA FWOOPER · M.O.M XXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Điểu Khúc Ca Fwooper!',
    body: 'Loài chim phép thuật có bộ lông hồng–cam nhiệt đới rực rỡ cùng khúc hát mê hoặc lòng người!'
  },
  {
    weight: 0.9,
    isZonk: false,
    prizeId: 'murtlap',
    kind: 'murtlap',
    icon: '🪸',
    badge: '🪸 CHUỘT BIỂN MURTLAP · M.O.M XXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Chuột Biển Murtlap!',
    body: 'Sinh vật ven biển đáng yêu có chùm hải quỳ phát sáng màu tím hồng trên lưng!'
  },
  {
    weight: 0.6,
    isZonk: false,
    prizeId: 'demiguise',
    kind: 'demiguise',
    icon: '🔮',
    badge: '🔮 DEMIGUISE DOUGAL · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Ẩn Hiện Thú Demiguise!',
    body: 'Sinh vật lông tơ bạc óng ánh có khả năng tàng hình và đôi mắt xanh lam thấu thị tương lai đang ôm quả cầu tiên tri!'
  },
  {
    weight: 0.6,
    isZonk: false,
    prizeId: 'occamy',
    kind: 'occamy',
    icon: '🐉',
    badge: '🐉 OCCAMY VẢY BẠC · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Xà Điểu Occamy Vảy Bạc!',
    body: 'Loài xà điểu có cánh tím viền vàng kim, khả năng co giãn Choranaptyxic kỳ diệu và ấp quả trứng bằng bạc nguyên chất!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'phoenix',
    kind: 'phoenix',
    icon: '🔥',
    badge: '🔥 PHƯỢNG HOÀNG FAWKES · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Phượng Hoàng Lửa Fawkes!',
    body: 'Thần điểu đỏ thẫm rực lửa với chiếc mào vàng kim trên đầu và giọt nước mắt phép thuật chữa lành mọi vết thương!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'thestral',
    kind: 'thestral',
    icon: '🦇',
    badge: '🦇 VONG MÃ THESTRAL · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Vong Mã Thestral!',
    body: 'Chiến mã có cánh màu đêm thẫm với khả năng định hướng phi thường trên bầu trời Hogwarts!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'unicorn',
    kind: 'unicorn',
    icon: '🦄',
    badge: '🦄 BẠCH KỲ MÃ HOÀNG KIM · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Bạch Kỳ Mã Hoàng Kim!',
    body: 'Kỳ lân thuần khiết của Rừng Cấm — khi còn nhỏ mang bộ lông vàng kim lấp lánh và khi trưởng thành trắng muốt như ánh trăng!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'thunderbird',
    kind: 'thunderbird',
    icon: '⚡',
    badge: '⚡ LÔI ĐIỂU FRANK · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Lôi Điểu Frank!',
    body: 'Thần điểu sáu cánh uy nghiêm vùng Arizona có khả năng cảm nhận hiểm nguy và gọi mây giông sấm sét!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'kelpie',
    kind: 'kelpie',
    icon: '🌊',
    badge: '🌊 THỦY MÃ KELPIE · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Thủy Mã Kelpie!',
    body: 'Thủy thần ngựa nước màu ngọc lục bảo với chiếc bờm rong biển mềm mại từ đáy Hồ Đen!'
  },
  {
    weight: 0.55,
    isZonk: false,
    prizeId: 'swooping',
    kind: 'swooping',
    icon: '🦋',
    badge: '🦋 BƯỚM ĐỘC SWOOPING EVIL · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Bướm Độc Swooping Evil!',
    body: 'Sinh vật có cánh xanh lục bảo pha lam điện kỳ ảo vừa giống bướm khổng lồ vừa giống tiểu long!'
  },
  {
    weight: 0.5,
    isZonk: false,
    prizeId: 'erumpent',
    kind: 'erumpent',
    icon: '🦏',
    badge: '🦏 TÊ GIÁC NỔ ERUMPENT · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Tê Giác Nổ Erumpent!',
    body: 'Thần thú châu Phi mũm mĩm có chiếc sừng phát sáng ánh hổ phách ấm áp trên mũi!'
  },
  {
    weight: 0.5,
    isZonk: false,
    prizeId: 'graphorn',
    kind: 'graphorn',
    icon: '🦬',
    badge: '🦬 QUỶ SỪNG VÀNG GRAPHORN · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Quỷ Sừng Vàng Graphorn!',
    body: 'Chúa tể núi xám với đôi sừng vàng kim óng ánh và những chiếc râu xúc tu ngộ nghĩnh quanh miệng!'
  },
  {
    weight: 0.5,
    isZonk: false,
    prizeId: 'runespoor',
    kind: 'runespoor',
    icon: '🐍',
    badge: '🐍 XÀ BA ĐẦU RUNESPOOR · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Xà Ba Đầu Runespoor!',
    body: 'Chú rắn phép thuật ba đầu màu cam sọc đen với 3 cá tính: Lập Kế Hoạch, Mơ Mộng và Phản Biện!'
  },
  {
    weight: 0.5,
    isZonk: false,
    prizeId: 'cerberus',
    kind: 'cerberus',
    icon: '🐶',
    badge: '🐶 CHÓ BA ĐẦU FLUFFY · M.O.M XXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ & NƠI TÌM RA CHÚNG',
    title: 'Trúng Chó Ba Đầu Fluffy!',
    body: 'Vệ thần ba đầu trông giữ cửa sập của bác Hagrid, cực kỳ mê ngủ khi nghe tiếng đàn hạc vàng!'
  },
  {
    weight: 0.3,
    isZonk: false,
    prizeId: 'dragon',
    kind: 'dragon',
    icon: '🐲',
    badge: '🐲 RỒNG ĐUÔI GAI HUNGARY · M.O.M XXXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ HUYỀN THOẠI (XXXXX)',
    title: 'Trúng Rồng Đuôi Gai Hungary (Huyền Thoại)!',
    body: 'Chúa tể loài rồng trong Tam Pháp Thuật với lớp vảy đồng đen, mắt vàng kim và chiếc đuôi gai dũng mãnh!'
  },
  {
    weight: 0.3,
    isZonk: false,
    prizeId: 'zouwu',
    kind: 'zouwu',
    icon: '🦁',
    badge: '🦁 SƯ MIÊU ZOUWU · M.O.M XXXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ HUYỀN THOẠI (XXXXX)',
    title: 'Trúng Sư Miêu Ngũ Sắc Zouwu (Huyền Thoại)!',
    body: 'Thần thú phương Đông với chiếc bờm lụa ngũ sắc phát sáng và chiếc đuôi lông vũ dài tuyệt đẹp!'
  },
  {
    weight: 0.28,
    isZonk: false,
    prizeId: 'nundu',
    kind: 'nundu',
    icon: '🐆',
    badge: '🐆 BÁO GAI NUNDU · M.O.M XXXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ HUYỀN THOẠI (XXXXX)',
    title: 'Trúng Báo Gai Nundu (Huyền Thoại)!',
    body: 'Mãnh thú báo đốm vàng kim với chiếc bờm xù tròn uy풍 lẫm liệt bậc nhất thế giới phù thủy!'
  },
  {
    weight: 0.26,
    isZonk: false,
    prizeId: 'acromantula',
    kind: 'acromantula',
    icon: '🕷️',
    badge: '🕷️ NHỆN KHỔNG LỒ ARAGOG · M.O.M XXXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ HUYỀN THOẠI (XXXXX)',
    title: 'Trúng Nhện Bông Aragog (Huyền Thoại)!',
    body: 'Người bạn tâm giao của bác Hagrid trong Rừng Cấm với lớp lông nhung đen ánh bạc và đôi mắt ngọc bích long lanh!'
  },
  {
    weight: 0.26,
    isZonk: false,
    prizeId: 'basilisk',
    kind: 'basilisk',
    icon: '👑',
    badge: '👑 TỬ XÀ VƯƠNG BASILISK · M.O.M XXXXX',
    eyebrow: 'SINH VẬT HUYỀN BÍ HUYỀN THOẠI (XXXXX)',
    title: 'Trúng Tử Xà Vương Basilisk (Huyền Thoại)!',
    body: 'Vua Mãng Xà vảy lục bảo lấp lánh với chiếc mào lông đỏ hoàng gia trên đỉnh đầu!'
  }
]

function rollMysteryBox() {
  const totalWeight = BOX_MYSTERIES.reduce((sum, item) => sum + (item.weight || 1), 0)
  let r = Math.random() * totalWeight
  for (const item of BOX_MYSTERIES) {
    r -= item.weight || 1
    if (r <= 0) return item
  }
  return BOX_MYSTERIES[0]
}

function pickGuaranteedBox(list, x) {
  if (x > 0.85) return null
  let best = null, dist = Infinity
  for (const t of list) {
    if (t.state !== 'free') continue
    const d = Math.abs((t.homeX ?? t.x) - x)
    if (d < dist) { dist = d; best = t }
  }
  return best
}

function play() {
  if (toys.every(t => t.state === 'collected')) refill()
  world?.clearUnbox?.()
  $('#overlay').classList.remove('unbox-stage')
  $('#overlay').hidden = true; paused = false; timeLeft = 20; keys.clear(); joystick.x = 0; hook.close = 0; held = null; success = false
  transition('aim'); updateTimer(); setStatus('Bấm Gắp bất cứ lúc nào — 100% trúng Hộp Sô-cô-la Ếch, mở hộp xem quà bên trong nhé!'); tone(520)
}
function updateTimer() { $('#time').innerHTML = `${Math.ceil(timeLeft).toString().padStart(2, '0')}<span>s</span>`; $('#time-bar').style.width = `${timeLeft / 20 * 100}%`; $('.timer').classList.toggle('hurry', timeLeft < 6) }
function refill() {
  toys.forEach(t => world.removeToy(t)); toys = []
  const slots = [-.9, -.62, -.34, -.06, .22, .5]
  slots.forEach((x, id) => {
    const kind = ['bear', 'rabbit', 'cat'][id % 3], scale = [.75, .7, .76, .72, .7, .75][id]
    const t = { id, kind, scale, radius: .18 * scale, x, homeX: x, y: .45 + id % 3 * .12, vx: 0, vy: 0, rz: 0, rows: 5, state: 'free' }
    t.mesh = world.addToy(t); toys.push(t)
  })
  hook.x = 0; hook.y = 1.65; hook.close = 0; held = null; timeLeft = 20; updateTimer()
}
function grab() {
  if (phase !== 'aim' || paused) return
  keys.clear(); joystick.x = 0
  const candidate = findCatch(toys, hook.x) || pickGuaranteedBox(toys, hook.x)
  targetY = candidate ? candidate.y + .42 * candidate.scale : .23
  transition('lower'); setStatus('Ngàm đang hạ xuống ôm trọn Hộp Sô-cô-la Ếch…'); tone(330, .18)
}
function finish() {
  transition('result')
  if (success && held) {
    held.rows = (held.rows ?? 1) - 1
    if (held.rows > 0) {
      held.state = 'free'; held.x = held.homeX ?? held.x; held.y = .06; held.vx = 0; held.vy = 0; held.rz = 0
    } else {
      held.state = 'collected'
    }

    if (isJsdom) {
      collection[held.kind]++; saveCollection(storage, collection); updateCollection(); world.celebrate(held); tone(523, .2); tone(659, .2, .12); tone(784, .3, .24)
      dialog({ icon: '🐸', eyebrow: 'MỞ HỘP SÔ-CÔ-LA ẾCH HONEYDUKES', title: 'Gắp được rồi!', body: `Hộp Sô-cô-la Ếch bật mở! ${TYPES[held.kind].name} đã thức tỉnh và về với bộ sưu tập của bạn.`, action: 'Gắp thêm hộp nữa', run: play })
      $('#dialog-home').hidden = false
      setStatus(`Mở hộp Sô-cô-la Ếch nhận được ${TYPES[held.kind].name}!`)
      return
    }

    const mystery = rollMysteryBox()

    if (mystery.isZonk) {
      world.tease({ ...held, prizeId: mystery.prizeId, badge: mystery.badge, title: mystery.title })
      tone(392, .14); tone(311, .24, .14)
      dialog({
        icon: mystery.icon,
        eyebrow: mystery.eyebrow,
        title: mystery.title,
        body: mystery.body,
        action: 'Gắp hộp khác phục thù ngay',
        run: play,
        unboxStage: true
      })
      setStatus(`${mystery.badge} — Thử mở hộp tiếp theo xem sao nhé!`)
    } else if (mystery.isChest) {
      const pwr = mystery.rarityPower || 2.2
      const wonGals = Math.floor(mystery.minGals + Math.pow(Math.random(), pwr) * (mystery.maxGals - mystery.minGals + 1))
      galleons += wonGals
      try { storage.setItem('momo-claw.gals.v1', String(galleons)) } catch {}
      updateCollection()
      backend?.broadcastChest({ amount: wonGals, totalGals: galleons })
      bridge?.reportGalleonsWon(wonGals, galleons)
      backend?.triggerCloudSync()
      const chestBadge = `🪙 RƯƠNG TIỀN +${wonGals} GALS!`
      const chestTitle = `${mystery.title} (+${wonGals} Gals)`
      const chestBody = `Rương Ngân hàng Gringotts bật mở tung đồng vàng lấp lánh! Bạn nhận được +${wonGals} Gals (Tổng túi vàng: ${galleons} Gals)!`
      world.celebrate({ ...held, isChest: true, gals: wonGals, prizeId: mystery.prizeId, badge: chestBadge, title: chestTitle })
      tone(587, .16); tone(784, .18, .1); tone(987, .28, .22)
      dialog({
        icon: mystery.icon,
        eyebrow: mystery.eyebrow,
        title: chestTitle,
        body: chestBody,
        action: 'Gắp thêm hộp nữa',
        run: play,
        unboxStage: true
      })
      setStatus(`${chestBadge} · Tổng túi vàng: ${galleons} Gals!`)
    } else {
      const awardKind = mystery.kind || held.kind
      collection[awardKind] = (collection[awardKind] || 0) + 1
      saveCollection(storage, collection)
      updateCollection()
      backend?.broadcastCatch({ kind: awardKind, beastName: TYPES[awardKind]?.name || mystery.badge, isBaby: true })
      bridge?.reportBeastCaught(awardKind, TYPES[awardKind]?.name)
      backend?.triggerCloudSync()
      world.celebrate({ ...held, kind: awardKind, prizeId: mystery.prizeId, badge: mystery.badge, title: mystery.title })
      tone(523, .2); tone(659, .2, .12); tone(784, .3, .24)
      dialog({
        icon: mystery.icon,
        eyebrow: mystery.eyebrow,
        title: mystery.title,
        body: mystery.body,
        action: 'Gắp thêm hộp nữa',
        run: play,
        unboxStage: true
      })
      $('#dialog-home').hidden = false
      setStatus(`Mở hộp nhận được: ${mystery.badge}!`)
    }
  } else {
    if (held) { held.state = 'free'; held.x = held.homeX ?? held.x; held.y = .06; held.vx = 0; held.vy = 0 }
    tone(280, .16); dialog({ icon: '🐸', eyebrow: 'THỬ LẠI MỘT CHÚT NÀO', title: 'Suýt nữa thôi!', body: 'Hãy di chuyển ngàm vào khu vực đống Hộp Sô-cô-la Ếch rồi bấm Gắp nhé.', action: 'Mình thử lại nhé', run: play }); setStatus('Chưa trúng hộp rồi. Lượt sau sẽ khéo hơn!')
  }
}
function physics(dt) {
  for (const toy of toys) {
    if (!['free', 'falling'].includes(toy.state)) continue
    toy.vy -= 5 * dt; toy.y += toy.vy * dt
    const floor = toy.state === 'falling' && inPrizeChute(toy.x) ? -.65 : -.08
    if (toy.y - toy.radius < floor) {
      toy.y = floor + toy.radius
      toy.vy = Math.abs(toy.vy) > .35 ? -toy.vy * .15 : 0
      toy.rz *= Math.exp(-dt * 8)
    }
  }
}
function simulate(dt) {
  if (paused || ['error'].includes(phase)) return
  physics(dt)
  if (phase === 'aim') {
    const x = joystick.x || Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
    hook.x = clamp(hook.x + x * dt * .7, -1.03, 1.03)
    timeLeft = Math.max(0, timeLeft - dt); updateTimer(); if (!timeLeft) grab(); return
  }
  if (['welcome', 'result'].includes(phase)) return
  elapsed += dt; const t = clamp(elapsed / durations[phase], 0, 1), k = ease(t)
  if (phase === 'lower') { hook.y = lerp(start.y, targetY, k); if (t === 1) transition('close') }
  else if (phase === 'close') {
    hook.close = k
    if (t === 1) {
      held = findCatch(toys, hook.x) || pickGuaranteedBox(toys, hook.x)
      if (held) {
        held.state = 'held'
        held.x = hook.x
        held.ox = 0
        held.oy = held.y - hook.y
        setStatus('Đã kẹp trúng Hộp Sô-cô-la Ếch! Đang đưa về Hố Nhận Quà…')
        tone(660, .1)
      }
      else setStatus('Móc chưa ôm được hộp nào. Thử lại nhé!')
      transition('lift')
    }
  } else if (phase === 'lift') {
    hook.y = lerp(start.y, 1.65, k)
    if (t === 1) transition(held ? 'deliver' : 'home')
  } else if (phase === 'deliver') {
    hook.x = lerp(start.x, .95, k)
    if (held) { held.ox *= Math.exp(-dt * 4);  }
    if (t === 1) { held.state = 'falling'; held.vy = 0; held.vx = 0; setStatus('Đến cửa nhận quà rồi…'); transition('drop') }
  } else if (phase === 'drop') {
    hook.close = 1 - Math.min(1, t * 3)
    if (held && held.y < -.1 && inPrizeChute(held.x)) success = true
    if (t === 1) transition('home')
  } else if (phase === 'home') {
    hook.x = lerp(start.x, 0, k); hook.close = 1 - k
    if (t === 1) finish()
  }
  if (held?.state === 'held') {
    held.x = hook.x + held.ox; held.y = hook.y + held.oy
    held.rz = Math.sin(elapsed * 5) * .06
  }
}
function pauseGame() {
  if (['welcome', 'result', 'error'].includes(phase) || paused) return
  paused = true; keys.clear(); joystick.x = 0; $('#grab').disabled = true
  dialog({ icon: '🪄', eyebrow: 'NGHỈ TAY MỘT CHÚT', title: 'Gia Tinh chờ bạn', body: 'Thời gian và lượt gắp được giữ nguyên.', action: 'Tiếp tục chơi', run: () => { paused = false; $('#overlay').hidden = true; $('#grab').disabled = phase !== 'aim'; lastTime = performance.now() } })
}
function frame(now) {
  const dt = Math.min((now - (lastTime || now)) / 1000, .05); lastTime = now
  if (currentView === 'arcade') { simulate(dt); world.render(dt, hook, toys, findCatch(toys, hook.x)) }
  else if (!document.hidden) petHome.tick(dt)
  requestAnimationFrame(frame)
}
updateCollection()
try {
  world = makeWorld($('#game-canvas')); refill(); $('#loading').hidden = true
  dialog({ icon: '🐸', eyebrow: 'CHÀO MỪNG ĐẾN TIỆM PHÉP THUẬT', title: 'Một lượt chơi,<br>một phép màu nhỏ.', body: 'Di chuyển móc đồng đến chính giữa Hộp Sô-cô-la Ếch ngũ giác, rồi bấm GẮP để mở hộp đón sinh vật huyền bí!', action: 'Chơi ngay', run: play })
  requestAnimationFrame(frame)
} catch (error) {
  console.error(error); $('#loading').hidden = true; phase = 'error'
  dialog({ icon: '🪄', eyebrow: 'GIA TINH ĐANG NGHỈ MỘT CHÚT', title: 'Chưa mở được máy.', body: 'Bạn thử tải lại trang để mở máy gắp nhé.', action: 'Tải lại trang', run: () => location.reload() })
}
$('#grab').onclick = grab; $('#pause').onclick = pauseGame
$('#refill').onclick = () => { if (!['aim', 'result', 'welcome'].includes(phase)) return; refill(); if (phase !== 'welcome') play(); tone(480) }
$('#help').onclick = () => {
  if (currentView === 'home') { $('#pet-message').textContent = 'Nhận nuôi thú đã gắp, đặt tên rồi cho ăn, chơi bóng hoặc ngủ. Chăm sóc 3 lần mở chậu cây, 7 lần mở dây sao. Chỉ số chỉ giảm nhẹ khi ở trong phòng.'; return }
  if (!['welcome', 'result'].includes(phase)) pauseGame()
  else dialog({ icon: '?', eyebrow: 'GẮP THÚ TRONG 3 BƯỚC', title: 'Căn · Gắp · Sưu tập', body: 'Dùng A/D, phím trái/phải hoặc cần điều khiển. Vòng ngắm dưới móc chuyển xanh khi trúng thú. Bấm GẮP hoặc Space. Bạn có 20 giây, hết giờ móc tự hạ.', action: 'Mình hiểu rồi, chơi thôi', run: play })
}
$('#sound').onclick = () => {
  audioEnabled = !audioEnabled; $('#sound').setAttribute('aria-pressed', audioEnabled); $('#sound').setAttribute('aria-label', audioEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'); $('#sound').classList.toggle('on', audioEnabled)
  $('#sound').innerHTML = `<svg viewBox="0 0 24 24"><path d="m11 5-5 4H3v6h3l5 4Z${audioEnabled ? 'M15 8q5 4 0 8m3-11q9 7 0 14' : 'm5 4 5 6m0-6-5 6'}"/></svg>`; tone(680)
}
$('#collection-link').onclick = () => switchView('collection')

window.addEventListener('keydown', e => {
  if (currentView !== 'arcade' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
  const key = e.key.toLowerCase()
  if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) { e.preventDefault(); keys.add(key) }
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); grab() }
  if (e.key === 'Escape') { if (paused) $('#dialog-action').click(); else pauseGame() }
})
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))
window.addEventListener('blur', () => { keys.clear(); joystick.x = 0 })
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); petHome.save() } })
const stick = $('#stick'), pad = $('#joystick'); let pointer = null
function setStick(e) {
  if (phase !== 'aim' || paused) return
  const r = pad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, max = r.width * .26
  joystick.x = clamp(x / max, -1, 1); stick.style.transform = `translateX(${joystick.x * max}px)`

}
function resetStick() { pointer = null; joystick.x = 0; stick.style.transform = 'translate(0,0)' }
pad.addEventListener('pointerdown', e => { pointer = e.pointerId; pad.setPointerCapture(pointer); setStick(e) })
pad.addEventListener('pointermove', e => { if (pointer === e.pointerId) setStick(e) })
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(event, resetStick)
window.addEventListener('blur', resetStick)

for (const [id, direction] of [['#move-left', -1], ['#move-right', 1]]) {
  const button = $(id)
  button.addEventListener('pointerdown', e => { button.setPointerCapture(e.pointerId); if (phase === 'aim' && !paused) joystick.x = direction })
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, resetStick)
  button.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (phase === 'aim' && !paused) joystick.x = direction } })
  button.addEventListener('keyup', resetStick)
  button.addEventListener('blur', resetStick)
}
