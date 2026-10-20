import { toyPortrait } from './art.js'
import { TYPES, lerp, clamp } from './rules.js'

const NS = 'http://www.w3.org/2000/svg'
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ']

export function makeWorld(container) {
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

  // Keep lightweight DOM/SVG structure for accessibility and JSDOM unit tests
  container.innerHTML = `<svg class="arcade-art" viewBox="0 0 620 650" role="img" aria-label="Tủ gắp hộp Sô-cô-la Ếch phép thuật Hogwarts 3D Canvas" ${isJsdom ? '' : 'style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden"'}>
    <g id="toys"></g>
    <g id="claw"><rect id="cable"/><g id="carriage"></g><g id="hook"><path id="left-finger"/><path id="right-finger"/></g></g>
    <ellipse id="aim-ring"/>
    <g id="roof-mascot"></g>
    <g id="won-prize"></g>
    <g id="confetti"></g>
  </svg>`

  const svg = container.querySelector('svg')
  const toyLayer = svg.querySelector('#toys')
  const hookEl = svg.querySelector('#hook')
  const carriage = svg.querySelector('#carriage')
  const cable = svg.querySelector('#cable')
  const ring = svg.querySelector('#aim-ring')
  const left = svg.querySelector('#left-finger')
  const right = svg.querySelector('#right-finger')
  const prize = svg.querySelector('#won-prize')
  const mascot = svg.querySelector('#roof-mascot')
  mascot.innerHTML = toyPortrait('rabbit')

  // Create high-DPI HTML5 Canvas in browser environments
  let canvas = null
  let ctx = null
  const W = 900
  const H = 840
  const portraitImages = {}
  const portraitAdultImages = {}
  if (!isJsdom) {
    for (const kind of Object.keys(TYPES)) {
      const img = new Image()
      img.src = `/beasts/${kind}_baby.png`
      portraitImages[kind] = img
      const adultImg = new Image()
      adultImg.src = `/beasts/${kind}.png`
      portraitAdultImages[kind] = adultImg
    }
    const chestImg = new Image()
    chestImg.src = '/beasts/chest.png'
    portraitImages.chest = chestImg
    canvas = document.createElement('canvas')
    canvas.className = 'arcade-canvas'
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)
    ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)

    // Make the 3D Control Deck & Glass Chamber touch-interactive on mobile & desktop
    let activeDirBtn = null
    let chamberDragId = null
    let chamberStartX = 0
    const startDir = dirSelector => {
      const btn = document.querySelector(dirSelector)
      if (!btn || activeDirBtn === btn) return
      stopDir()
      activeDirBtn = btn
      btn.dispatchEvent(new Event('pointerdown'))
    }
    const stopDir = () => {
      chamberDragId = null
      if (activeDirBtn) {
        activeDirBtn.dispatchEvent(new Event('pointerup'))
        activeDirBtn = null
      }
    }
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect()
      const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W
      const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * H

      // 3D Joystick zone on Front-Left Control Deck (cx: 170..335, cy: 605..740)
      if (cy >= 595 && cy <= 745 && cx >= 170 && cx <= 335) {
        startDir(cx < 250 ? '#move-left' : '#move-right')
        return
      }
      // 3D Brass Grab Button zone on Control Deck (cx: 350..515, cy: 605..740)
      if (cy >= 595 && cy <= 745 && cx >= 350 && cx <= 515) {
        document.querySelector('#grab')?.click()
        return
      }
      // Touch/drag inside the Glass Chamber (cy: 210..595) to steer the claw on mobile screens
      if (cy >= 210 && cy < 595 && cx >= 160 && cx <= 740) {
        chamberDragId = e.pointerId
        chamberStartX = e.clientX
        canvas.setPointerCapture?.(e.pointerId)
        const clawScreenX = cpx(prevHookX)
        if (Math.abs(cx - clawScreenX) > 22) {
          startDir(cx < clawScreenX ? '#move-left' : '#move-right')
        }
      }
    })
    canvas.addEventListener('pointermove', e => {
      if (chamberDragId === null || e.pointerId !== chamberDragId) return
      const dx = e.clientX - chamberStartX
      if (Math.abs(dx) > 10) {
        startDir(dx < 0 ? '#move-left' : '#move-right')
        chamberStartX = e.clientX
      }
    })
    window.addEventListener('pointerup', stopDir)
    window.addEventListener('pointercancel', stopDir)
  }

  // Coordinate mapping from game normalized space (x in [-1.03, 1.03], y in [-0.65, 1.65]) to Canvas space
  const cpx = x => 450 + x * 228
  const cpy = y => 568 - y * 172
  const px = x => 307 + x * 154
  const py = y => 436 - y * 130

  const FLOOR_Y = 582
  const CHUTE_X = cpx(0.62) // Matches inPrizeChute(x > 0.62) in rules.js

  // Enchanted floating candles inside chamber
  const candles = [
    { x: 242, y: 278, h: 34, phase: 0.2 },
    { x: 372, y: 256, h: 30, phase: 1.7 },
    { x: 528, y: 264, h: 32, phase: 3.1 },
    { x: 654, y: 282, h: 35, phase: 4.5 }
  ]

  // Ambient floating stardust motes inside chamber
  const motes = Array.from({ length: 22 }, (_, i) => ({
    x: 195 + ((i * 73) % 510),
    y: 250 + ((i * 53) % 310),
    r: 1.2 + (i % 3) * 0.7,
    speed: 10 + (i % 5) * 4,
    phase: i * 0.9
  }))

  // Constellation stars on the Gothic crown arch
  const constellation = [
    [335, 168], [372, 150], [402, 162], [432, 134], [450, 118],
    [468, 134], [498, 162], [528, 150], [565, 168]
  ]

  const particles = []
  const canvasSparks = []
  let lastAward = null
  let unboxState = null
  let clockTime = 0
  let prevHookX = 0
  let prevHookY = 1.65
  let swingAngle = 0
  let swingVel = 0
  let gearAngle = 0
  let stickTilt = 0

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r)
    } else {
      const rr = Math.min(r, w / 2, h / 2)
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    }
  }

  function makeGoldGrad(x1, y1, x2, y2) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2)
    g.addColorStop(0, '#6e4815')
    g.addColorStop(0.28, '#d4a243')
    g.addColorStop(0.52, '#fff0b3')
    g.addColorStop(0.76, '#b88228')
    g.addColorStop(1, '#54350d')
    return g
  }

  function makeWoodGrad(x1, y1, x2, y2) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2)
    g.addColorStop(0, '#4f2d1d')
    g.addColorStop(0.45, '#341c11')
    g.addColorStop(1, '#1c0e08')
    return g
  }

  // 1. Draw Hogwarts Castle Turret Skyline & Triple-Arched Gothic Crown
  function drawCastleAndCrown(t) {
    // Warm magical aura behind the castle skyline
    const skyGlow = ctx.createRadialGradient(450, 130, 15, 450, 130, 290)
    skyGlow.addColorStop(0, 'rgba(245, 194, 88, 0.34)')
    skyGlow.addColorStop(0.55, 'rgba(180, 108, 35, 0.12)')
    skyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = skyGlow
    ctx.beginPath()
    ctx.arc(450, 130, 290, 0, Math.PI * 2)
    ctx.fill()

    // Helper to draw a 3D-shaded Hogwarts turret spire
    function drawSpire(cx, baseY, wBot, wTop, hBody, hRoof, hasDormer = false) {
      const topY = baseY - hBody
      const bodyGrad = ctx.createLinearGradient(cx - wBot / 2, topY, cx + wBot / 2, baseY)
      bodyGrad.addColorStop(0, '#301b11')
      bodyGrad.addColorStop(0.35, '#593622')
      bodyGrad.addColorStop(0.85, '#29160d')
      bodyGrad.addColorStop(1, '#170b06')
      ctx.fillStyle = bodyGrad
      ctx.beginPath()
      ctx.moveTo(cx - wBot / 2, baseY)
      ctx.lineTo(cx - wTop / 2, topY)
      ctx.lineTo(cx + wTop / 2, topY)
      ctx.lineTo(cx + wBot / 2, baseY)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#8c6224'
      ctx.lineWidth = 1.2
      ctx.stroke()

      // Brass corbel collar ring
      ctx.fillStyle = makeGoldGrad(cx - wTop / 2 - 4, topY - 4, cx + wTop / 2 + 4, topY + 4)
      drawRoundedRect(cx - wTop / 2 - 3, topY - 3, wTop + 6, 6, 3)
      ctx.fill()

      // Conical turret roof
      const roofGrad = ctx.createLinearGradient(cx - wTop * 0.65, topY, cx + wTop * 0.65, topY - hRoof)
      roofGrad.addColorStop(0, '#1e1624')
      roofGrad.addColorStop(0.4, '#433046')
      roofGrad.addColorStop(1, '#140e18')
      ctx.fillStyle = roofGrad
      ctx.beginPath()
      ctx.moveTo(cx - wTop * 0.64, topY - 1)
      ctx.lineTo(cx, topY - hRoof)
      ctx.lineTo(cx + wTop * 0.64, topY - 1)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#b88938'
      ctx.lineWidth = 1
      ctx.stroke()

      // Gold finial needle & star tip
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, topY - hRoof)
      ctx.lineTo(cx, topY - hRoof - 14)
      ctx.stroke()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(cx, topY - hRoof - 15, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Glowing amber slit windows
      const winPulse = 0.75 + 0.25 * Math.sin(t * 2.6 + cx * 0.05)
      ctx.fillStyle = `rgba(253, 224, 71, ${winPulse})`
      ctx.shadowColor = '#f59e0b'
      ctx.shadowBlur = 8
      for (const ox of [-wBot * 0.22, 0, wBot * 0.22]) {
        if (wBot < 26 && ox !== 0) continue
        drawRoundedRect(cx + ox - 2, baseY - hBody * 0.66, 4, 11, 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      if (hasDormer) {
        const dx = cx - wTop * 0.34
        const dy = topY - hRoof * 0.32
        ctx.fillStyle = '#4a2b1a'
        ctx.fillRect(dx - 6, dy, 12, 13)
        ctx.fillStyle = '#291d30'
        ctx.beginPath()
        ctx.moveTo(dx - 8, dy)
        ctx.lineTo(dx, dy - 11)
        ctx.lineTo(dx + 8, dy)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fde047'
        ctx.fillRect(dx - 2, dy + 3, 4, 6)
      }
    }

    // Great Hall Keep behind Central Tower
    ctx.fillStyle = makeWoodGrad(385, 76, 455, 135)
    drawRoundedRect(388, 82, 72, 48, 4)
    ctx.fill()
    ctx.fillStyle = '#281c2d'
    ctx.beginPath()
    ctx.moveTo(382, 84)
    ctx.lineTo(424, 54)
    ctx.lineTo(466, 84)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#b88938'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 7 Hogwarts Castle Turret Spires
    drawSpire(288, 134, 22, 19, 34, 26, false)
    drawSpire(334, 132, 34, 30, 52, 38, false)
    drawSpire(384, 130, 20, 18, 60, 32, false)
    drawSpire(456, 130, 48, 42, 74, 48, true)
    drawSpire(516, 130, 25, 22, 56, 36, false)
    drawSpire(566, 132, 36, 32, 50, 36, false)
    drawSpire(612, 134, 22, 19, 32, 25, false)

    // Upper Entablature Box & Cornice Moldings
    ctx.fillStyle = makeWoodGrad(135, 128, 135, 212)
    drawRoundedRect(136, 132, 628, 76, 14)
    ctx.fill()
    ctx.strokeStyle = '#d4a243'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Top & bottom metallic brass cornice bars
    ctx.fillStyle = makeGoldGrad(126, 126, 774, 126)
    drawRoundedRect(126, 125, 648, 11, 5)
    ctx.fill()
    ctx.fillStyle = makeGoldGrad(128, 202, 772, 202)
    drawRoundedRect(128, 202, 644, 11, 5)
    ctx.fill()

    // Triple-Arched Gothic Crown Pediment
    for (const [ax, ay, r] of [[282, 196, 62], [618, 196, 62], [450, 198, 108]]) {
      const archGrad = ctx.createRadialGradient(ax, ay - r * 0.4, 8, ax, ay, r)
      archGrad.addColorStop(0, '#3c2215')
      archGrad.addColorStop(0.7, '#22120b')
      archGrad.addColorStop(1, '#140a06')
      ctx.fillStyle = archGrad
      ctx.beginPath()
      ctx.arc(ax, ay, r, Math.PI, 0, false)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = makeGoldGrad(ax - r, ay - r, ax + r, ay)
      ctx.lineWidth = r > 80 ? 8 : 6
      ctx.beginPath()
      ctx.arc(ax, ay, r, Math.PI, 0, false)
      ctx.stroke()
    }

    // Golden Constellation Lines & Stars inside the Gothic Arches
    ctx.save()
    ctx.strokeStyle = 'rgba(247, 215, 132, 0.55)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    constellation.forEach(([sx, sy], idx) => {
      if (idx === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    })
    ctx.stroke()
    constellation.forEach(([sx, sy], idx) => {
      const pulse = 2.2 + Math.sin(t * 3 + idx) * 0.8
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(sx, sy, pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(212, 162, 67, 0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2)
      ctx.stroke()
    })
    for (const sx of [258, 642]) {
      ctx.strokeStyle = 'rgba(245, 208, 118, 0.45)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(sx, 170, 16, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(sx, 170, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Embossed Riveted Brass "HOGWARTS" Plaque on Front Crown
    const px0 = 304, py0 = 144, pw = 292, ph = 54
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    ctx.fillStyle = makeGoldGrad(px0, py0, px0, py0 + ph)
    drawRoundedRect(px0, py0, pw, ph, 12)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 2.5
    drawRoundedRect(px0 + 4, py0 + 4, pw - 8, ph - 8, 9)
    ctx.stroke()
    ctx.strokeStyle = '#fff5cc'
    ctx.lineWidth = 1.2
    drawRoundedRect(px0 + 7, py0 + 7, pw - 14, ph - 14, 7)
    ctx.stroke()

    for (const [rx, ry] of [
      [px0 + 14, py0 + 14], [px0 + pw - 14, py0 + 14],
      [px0 + 14, py0 + ph - 14], [px0 + pw - 14, py0 + ph - 14],
      [px0 + 14, py0 + ph / 2], [px0 + pw - 14, py0 + ph / 2]
    ]) {
      ctx.fillStyle = '#5c3811'
      ctx.beginPath(); ctx.arc(rx, ry, 3.2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath(); ctx.arc(rx - 0.8, ry - 0.8, 2, 0, Math.PI * 2); ctx.fill()
    }

    ctx.fillStyle = '#2b1608'
    ctx.font = '900 30px Cinzel, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('HOGWARTS', 450, py0 + 24)
    ctx.fillStyle = '#5c3412'
    ctx.font = '700 8.5px Cinzel, Georgia, serif'
    ctx.fillText('✦ HONEYDUKES · CHOCOLATE FROG ARCADE ✦', 450, py0 + 43)
  }

  // 2. Draw 3D-Perspective Enchanted Display Chamber, Rune Back Wall & Floating Candles
  function drawChamberBackdrop(t) {
    const chX = 176, chY = 213, chW = 548, chH = 398

    const bgGrad = ctx.createLinearGradient(chX, chY, chX, chY + chH)
    bgGrad.addColorStop(0, '#160d21')
    bgGrad.addColorStop(0.55, '#22142b')
    bgGrad.addColorStop(1, '#141e1f')
    ctx.fillStyle = bgGrad
    ctx.fillRect(chX, chY, chW, chH)

    // 3D Interior Perspective Side Walls
    ctx.fillStyle = '#23130d'
    ctx.beginPath()
    ctx.moveTo(chX, chY)
    ctx.lineTo(chX + 34, chY + 22)
    ctx.lineTo(chX + 34, FLOOR_Y - 24)
    ctx.lineTo(chX, FLOOR_Y)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(chX + chW, chY)
    ctx.lineTo(chX + chW - 34, chY + 22)
    ctx.lineTo(chX + chW - 34, FLOOR_Y - 24)
    ctx.lineTo(chX + chW, FLOOR_Y)
    ctx.closePath()
    ctx.fill()

    // Back Wall with 3 Recessed Gothic Wainscoting Panels
    const bwX = chX + 34, bwY = chY + 22, bwW = chW - 68, bwH = FLOOR_Y - 24 - bwY
    const bwGrad = ctx.createLinearGradient(bwX, bwY, bwX, bwY + bwH)
    bwGrad.addColorStop(0, '#211318')
    bwGrad.addColorStop(1, '#170d12')
    ctx.fillStyle = bwGrad
    ctx.fillRect(bwX, bwY, bwW, bwH)

    for (let i = 0; i < 3; i++) {
      const px0 = bwX + 26 + i * 148
      const pw = 132
      const py0 = bwY + 18
      const ph = bwH - 36
      ctx.strokeStyle = 'rgba(212, 162, 67, 0.24)'
      ctx.lineWidth = 2
      ctx.strokeRect(px0, py0, pw, ph)
      ctx.strokeStyle = 'rgba(245, 208, 118, 0.16)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(px0 + pw / 2, py0 + 58, pw / 2 - 8, Math.PI, 0, false)
      ctx.lineTo(px0 + pw - 8, py0 + ph - 8)
      ctx.lineTo(px0 + 8, py0 + ph - 8)
      ctx.closePath()
      ctx.stroke()
    }

    // Glowing Golden Runes along Back Wall Borders
    ctx.save()
    ctx.font = 'bold 13px Georgia, serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < 9; i++) {
      const alpha = 0.35 + 0.3 * Math.sin(t * 2.2 + i * 0.7)
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
      ctx.shadowColor = '#f59e0b'
      ctx.shadowBlur = 8
      const ry = bwY + 32 + i * 32
      ctx.fillText(RUNES[i % RUNES.length], bwX + 13, ry)
      ctx.fillText(RUNES[(i + 5) % RUNES.length], bwX + bwW - 13, ry)
    }
    ctx.restore()

    // Floating Stardust Motes
    motes.forEach(m => {
      const my = bwY + ((m.y - t * m.speed) % bwH + bwH) % bwH
      const mx = m.x + Math.sin(t * 1.5 + m.phase) * 8
      const alpha = 0.3 + 0.45 * Math.sin(t * 2.8 + m.phase)
      ctx.fillStyle = `rgba(254, 240, 138, ${Math.max(0.1, alpha)})`
      ctx.beginPath()
      ctx.arc(mx, my, m.r, 0, Math.PI * 2)
      ctx.fill()
    })

    // 4 Floating Enchanted Hogwarts Candles with Volumetric Light Pools
    candles.forEach((c, idx) => {
      const cy = c.y + Math.sin(t * 2.3 + c.phase) * 6
      const flicker = 1 + Math.sin(t * 14 + idx * 2.1) * 0.08

      const glow = ctx.createRadialGradient(c.x, cy - 12, 2, c.x, cy - 12, 58 * flicker)
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.52)')
      glow.addColorStop(0.45, 'rgba(245, 158, 11, 0.18)')
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(c.x, cy - 12, 58 * flicker, 0, Math.PI * 2)
      ctx.fill()

      const waxGrad = ctx.createLinearGradient(c.x - 5, cy, c.x + 5, cy)
      waxGrad.addColorStop(0, '#fdf8eb')
      waxGrad.addColorStop(0.6, '#efe2c6')
      waxGrad.addColorStop(1, '#cbb692')
      ctx.fillStyle = waxGrad
      drawRoundedRect(c.x - 4.5, cy - 4, 9, c.h, 3)
      ctx.fill()

      ctx.fillStyle = '#fcf5e3'
      ctx.beginPath()
      ctx.ellipse(c.x, cy - 3, 5.8, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#29180e'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(c.x, cy - 4)
      ctx.lineTo(c.x, cy - 8)
      ctx.stroke()

      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.ellipse(c.x, cy - 14, 4.2 * flicker, 8 * flicker, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef9c3'
      ctx.beginPath()
      ctx.ellipse(c.x, cy - 13, 2 * flicker, 4.5 * flicker, 0, 0, Math.PI * 2)
      ctx.fill()
    })

    // 3D Perspective Deep Emerald Velvet Floor Mat
    const flGrad = ctx.createLinearGradient(0, FLOOR_Y - 30, 0, chY + chH)
    flGrad.addColorStop(0, '#11382c')
    flGrad.addColorStop(0.4, '#1b5744')
    flGrad.addColorStop(1, '#0c2920')
    ctx.fillStyle = flGrad
    ctx.beginPath()
    ctx.moveTo(bwX, FLOOR_Y - 26)
    ctx.lineTo(bwX + bwW, FLOOR_Y - 26)
    ctx.lineTo(chX + chW, chY + chH)
    ctx.lineTo(chX, chY + chH)
    ctx.closePath()
    ctx.fill()

    // Golden perspective floor trim lines
    ctx.strokeStyle = 'rgba(212, 162, 67, 0.28)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(bwX, FLOOR_Y - 26)
    ctx.lineTo(bwX + bwW, FLOOR_Y - 26)
    for (let i = 1; i <= 5; i++) {
      const bx = bwX + (bwW * i) / 6
      const fx = chX + (chW * i) / 6
      ctx.moveTo(bx, FLOOR_Y - 26)
      ctx.lineTo(fx, chY + chH)
    }
    ctx.stroke()

    // Front-Right Brass-Walled Prize Chute Backdrop Hole (at x > CHUTE_X)
    const chuteW = chX + chW - CHUTE_X - 10
    const chuteY = FLOOR_Y - 20
    const chuteH = chY + chH - chuteY

    ctx.fillStyle = '#0c0705'
    drawRoundedRect(CHUTE_X, chuteY, chuteW, chuteH + 6, 6)
    ctx.fill()
  }

  // Draw Foreground Brass Chute Guard Rail & Opening Label so the Prize Chute is always open & uncovered
  function drawPrizeChuteForeground() {
    const chX = 180
    const chY = 215
    const chW = 540
    const chH = 382
    const chuteW = chX + chW - CHUTE_X - 10
    const chuteY = FLOOR_Y - 20
    const chuteH = chY + chH - chuteY

    // Dark chute drop opening
    ctx.fillStyle = '#0a0504'
    drawRoundedRect(CHUTE_X, chuteY - 4, chuteW, chuteH + 10, 6)
    ctx.fill()

    // Inner golden rim glow inside the chute mouth
    ctx.strokeStyle = 'rgba(245, 208, 118, 0.35)'
    ctx.lineWidth = 1.5
    drawRoundedRect(CHUTE_X + 4, chuteY, chuteW - 8, chuteH, 4)
    ctx.stroke()

    // Vertical left brass guard post of the chute
    ctx.fillStyle = makeGoldGrad(CHUTE_X - 6, chuteY - 34, CHUTE_X + 8, chuteY - 34)
    drawRoundedRect(CHUTE_X - 5, chuteY - 34, 11, chuteH + 40, 5)
    ctx.fill()
    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Horizontal top brass guard bar of the chute
    ctx.fillStyle = makeGoldGrad(CHUTE_X, chuteY - 34, CHUTE_X + chuteW, chuteY - 24)
    drawRoundedRect(CHUTE_X - 2, chuteY - 34, chuteW + 6, 9, 4)
    ctx.fill()
    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.fillStyle = 'rgba(253, 224, 71, 0.92)'
    ctx.font = '700 10px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⬇ HỐ NHẬN QUÀ', CHUTE_X + chuteW / 2 + 2, chuteY + 22)
  }

  // 3. Draw 3D-Shaded Canonical MinaLima Pentagonal Chocolate Frog Box on Canvas
  const ROW_STEP_Y = 29

  // Organic tumbled heap of 37 Chocolate Frog Boxes across 5 layers:
  // - Messy, non-grid positions & rotations
  // - Packs all the way to the right wall above the chute AND right up against the chute guard wall
  // - Leaves the Prize Chute opening (x = 590..708, y = 510..592) 100% open & uncovered!
  // 28 Fantastic Beasts ordered with the 20 NEW beasts on the front/middle layers of the heap
  const HEAP_BEAST_ORDER = [
    // Layer 0 (8 boxes - back row: classic 8 beasts)
    'bear', 'rabbit', 'cat', 'bowtruckle', 'demiguise', 'occamy', 'puffskein', 'phoenix',
    // Layer 1 (9 boxes - upper-mid row: new beasts + chest)
    'mooncalf', 'augurey', 'fwooper', 'diricawl', 'erumpent', 'graphorn', 'murtlap', 'runespoor', 'kelpie',
    // Layer 2 (7 boxes - middle row: new beasts)
    'hippogriff', 'thestral', 'unicorn', 'thunderbird', 'swooping', 'nundu', 'acromantula',
    // Layer 3 (7 boxes - lower-mid row: new beasts)
    'dragon', 'zouwu', 'basilisk', 'cerberus', 'erumpent', 'graphorn', 'fwooper',
    // Layer 4 (6 boxes - front row: iconic new beasts right at the front glass!)
    'hippogriff', 'unicorn', 'dragon', 'zouwu', 'basilisk', 'cerberus'
  ]

  const HEAP_BOXES = [
    // Layer 0 (Back / Top heap layer, y ≈ 434..450) — spans full width x=220..676 above the chute
    { x: 222, y: 446, rot: -0.22, sc: 0.75, toyIdx: 0, rowReq: 5 },
    { x: 284, y: 435, rot: 0.19, sc: 0.76, toyIdx: 1, rowReq: 5 },
    { x: 348, y: 448, rot: -0.16, sc: 0.74, toyIdx: 2, rowReq: 5 },
    { x: 412, y: 434, rot: 0.24, sc: 0.77, toyIdx: 3, rowReq: 5 },
    { x: 478, y: 445, rot: -0.21, sc: 0.75, toyIdx: 4, rowReq: 5 },
    { x: 542, y: 436, rot: 0.17, sc: 0.76, toyIdx: 5, rowReq: 5 },
    { x: 608, y: 444, rot: -0.24, sc: 0.75, toyIdx: 1, rowReq: 5 },
    { x: 672, y: 438, rot: 0.18, sc: 0.75, toyIdx: 4, rowReq: 5 },

    // Layer 1 (Upper-mid heap layer, y ≈ 462..480) — spans x=216..670 (right boxes sit behind/above chute rail)
    { x: 216, y: 476, rot: 0.18, sc: 0.77, toyIdx: 0, rowReq: 4 },
    { x: 266, y: 464, rot: -0.25, sc: 0.78, toyIdx: 0, rowReq: 4 },
    { x: 322, y: 478, rot: 0.22, sc: 0.76, toyIdx: 1, rowReq: 4 },
    { x: 382, y: 465, rot: -0.19, sc: 0.78, toyIdx: 2, rowReq: 4 },
    { x: 442, y: 477, rot: 0.16, sc: 0.77, toyIdx: 3, rowReq: 4 },
    { x: 502, y: 463, rot: -0.26, sc: 0.78, toyIdx: 4, rowReq: 4 },
    { x: 558, y: 474, rot: 0.21, sc: 0.77, toyIdx: 5, rowReq: 4 },
    { x: 618, y: 468, rot: -0.18, sc: 0.76, toyIdx: 2, rowReq: 4 },
    { x: 672, y: 472, rot: 0.23, sc: 0.75, toyIdx: 5, rowReq: 4 },

    // Layer 2 (Middle heap layer, y ≈ 492..510) — packs tightly from left x=224 right up to chute rail x=556
    { x: 228, y: 504, rot: -0.19, sc: 0.79, toyIdx: 0, rowReq: 3 },
    { x: 282, y: 494, rot: 0.25, sc: 0.78, toyIdx: 1, rowReq: 3 },
    { x: 338, y: 508, rot: -0.23, sc: 0.80, toyIdx: 2, rowReq: 3 },
    { x: 394, y: 495, rot: 0.18, sc: 0.79, toyIdx: 3, rowReq: 3 },
    { x: 450, y: 507, rot: -0.16, sc: 0.78, toyIdx: 4, rowReq: 3 },
    { x: 506, y: 494, rot: 0.24, sc: 0.80, toyIdx: 5, rowReq: 3 },
    { x: 554, y: 505, rot: -0.21, sc: 0.79, toyIdx: 5, rowReq: 3 },

    // Layer 3 (Lower-mid heap layer, y ≈ 522..540) — packs tightly from x=218 right up to chute wall x=552
    { x: 218, y: 534, rot: 0.23, sc: 0.80, toyIdx: 0, rowReq: 2 },
    { x: 270, y: 525, rot: -0.18, sc: 0.81, toyIdx: 1, rowReq: 2 },
    { x: 324, y: 538, rot: 0.16, sc: 0.79, toyIdx: 1, rowReq: 2 },
    { x: 378, y: 526, rot: -0.25, sc: 0.81, toyIdx: 2, rowReq: 2 },
    { x: 436, y: 537, rot: 0.21, sc: 0.80, toyIdx: 3, rowReq: 2 },
    { x: 494, y: 524, rot: -0.17, sc: 0.81, toyIdx: 4, rowReq: 2 },
    { x: 548, y: 535, rot: 0.25, sc: 0.80, toyIdx: 5, rowReq: 2 },

    // Layer 4 (Front floor heap layer, y ≈ 552..566) — packs tightly from x=228 right up to chute wall x=550
    { x: 228, y: 562, rot: -0.17, sc: 0.82, toyIdx: 0, rowReq: 1, isPrimarySlot: true },
    { x: 288, y: 555, rot: 0.22, sc: 0.81, toyIdx: 1, rowReq: 1, isPrimarySlot: true },
    { x: 350, y: 565, rot: -0.20, sc: 0.83, toyIdx: 2, rowReq: 1, isPrimarySlot: true },
    { x: 416, y: 556, rot: 0.15, sc: 0.82, toyIdx: 3, rowReq: 1, isPrimarySlot: true },
    { x: 482, y: 564, rot: -0.23, sc: 0.81, toyIdx: 4, rowReq: 1, isPrimarySlot: true },
    { x: 546, y: 556, rot: 0.19, sc: 0.82, toyIdx: 5, rowReq: 1, isPrimarySlot: true }
  ].map((box, idx) => ({ ...box, beastKind: HEAP_BEAST_ORDER[idx % HEAP_BEAST_ORDER.length] }))

  function drawChocolateFrogBoxOnCanvas(
    toy,
    hook,
    t,
    isUnboxedHatch = false,
    rowIndex = 0,
    isTopOfStack = true,
    overrideY = null,
    overrideX = null,
    overrideRot = null,
    overrideScale = null,
    overrideBeastKind = null
  ) {
    if (toy.state === 'collected' && !isUnboxedHatch) return

    const x = overrideX !== null ? overrideX : cpx(toy.x)
    const y = overrideY !== null ? overrideY : cpy(toy.y) - rowIndex * ROW_STEP_Y
    const sc = overrideScale !== null ? overrideScale : (isUnboxedHatch ? toy.scale * 1.12 : toy.scale * 0.80)

    // Determine box interaction state (only the targeted box or active box lifts its lid)
    let mode = 'idle'
    if (isUnboxedHatch) mode = 'unboxed'
    else if (toy.state === 'held' && isTopOfStack) mode = 'grabbed'
    else if (toy.state === 'falling' && isTopOfStack && toy.x > 0.55) mode = 'happy'
    else if (isTopOfStack && hook.aim && Math.abs(x - cpx(hook.x)) < 38) mode = 'nervous'

    // Dynamic squash, rattle & slip-lid lift
    let sx = 1
    let sy = 1
    let lidLift = 0
    let lidTilt = 0

    if (mode === 'unboxed') {
      lidLift = 22
      lidTilt = -0.26
    } else if (mode === 'grabbed') {
      sx = 0.96 + Math.sin(t * 14) * 0.015
      sy = 1.04 - Math.sin(t * 14) * 0.015
      lidLift = 0
      lidTilt = 0
    } else if (mode === 'nervous') {
      const hop = Math.max(0, Math.sin(t * 11 + toy.id))
      sx = 1 + hop * 0.025
      sy = 1 - hop * 0.02
      lidLift = 0
      lidTilt = 0
    } else {
      lidLift = 0
    }

    // 3D Pentagon geometry helper in oblique 3/4 view (rx = width radius, ry = foreshortened depth radius)
    const RX = 38
    const RY = 23
    const pVert = (i, rx = RX, ry = RY, yOff = 0) => {
      // i=0: top-back apex (0, -ry)
      // i=1: upper-right, i=2: front-right, i=3: front-left, i=4: upper-left
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
      return {
        x: Math.cos(a) * rx,
        y: Math.sin(a) * ry + yOff
      }
    }

    ctx.save()
    ctx.translate(x, y)

    // Contact shadow under the pentagonal box in the pile
    if (!isUnboxedHatch && (toy.state === 'free' || !isTopOfStack)) {
      ctx.fillStyle = 'rgba(8, 4, 18, 0.38)'
      ctx.beginPath()
      ctx.ellipse(0, 22 * sc, 38 * sc, 10 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const baseRot = overrideRot !== null ? overrideRot : toy.rz
    ctx.rotate(baseRot + (mode === 'nervous' ? Math.sin(t * 26) * 0.04 : 0))
    ctx.scale(sc * sx, sc * sy)

    const baseTopY = 2
    const baseBotY = 18

    // === 1. STEPPED GOLD FOIL BOTTOM RIM FLANGE ===
    ctx.fillStyle = makeGoldGrad(-RX, baseBotY, RX, baseBotY + 5)
    ctx.strokeStyle = '#5c3811'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const v = pVert(i, RX * 1.05, RY * 1.05, baseBotY + 2)
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // === 2. LOWER PENTAGONAL BASE BOX (Visible Front-Left, Front-Center, Front-Right Walls) ===
    // In our pentagon (i=0 at top, i=1 right-back, i=2 right-front, i=3 left-front, i=4 left-back),
    // the 3 front-facing edges are (4 -> 3), (3 -> 2), and (2 -> 1).
    const wallEdges = [
      { a: 4, b: 3, col1: '#1a0b36', col2: '#120726' }, // Left-front slanted wall
      { a: 1, b: 2, col1: '#180a30', col2: '#0f0520' }, // Right-front slanted wall
      { a: 3, b: 2, col1: '#2b1454', col2: '#1c0c3b' }  // Flat center-front wall
    ]
    wallEdges.forEach(({ a, b, col1, col2 }) => {
      const tA = pVert(a, RX * 0.97, RY * 0.97, baseTopY)
      const tB = pVert(b, RX * 0.97, RY * 0.97, baseTopY)
      const bA = pVert(a, RX * 0.97, RY * 0.97, baseBotY)
      const bB = pVert(b, RX * 0.97, RY * 0.97, baseBotY)

      const wGrad = ctx.createLinearGradient(tA.x, tA.y, bB.x, bB.y)
      wGrad.addColorStop(0, col1)
      wGrad.addColorStop(1, col2)
      ctx.fillStyle = wGrad
      ctx.beginPath()
      ctx.moveTo(tA.x, tA.y)
      ctx.lineTo(tB.x, tB.y)
      ctx.lineTo(bB.x, bB.y)
      ctx.lineTo(bA.x, bA.y)
      ctx.closePath()
      ctx.fill()

      // Gold foil border frame on each base wall
      ctx.strokeStyle = '#e5bc68'
      ctx.lineWidth = 1.3
      ctx.stroke()
    })

    // Gold foil lettering on the flat front base wall (3 -> 2)
    ctx.fillStyle = '#f5d27e'
    ctx.font = '700 4.8px Cinzel, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('✦ 70% WIZARDING COCOA ✦', 0, baseBotY + RY * 0.72 - 3)

    // === 3. PLEATED GOLD SATIN INTERIOR, WIZARD CARD & 3D CHOCOLATE FROG (Visible when unboxed in hatch!) ===
    if (isUnboxedHatch && lidLift > 1) {
      // Pleated gold-and-crimson satin tray top
      ctx.fillStyle = '#b47d2a'
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const v = pVert(i, RX * 0.93, RY * 0.93, baseTopY)
        if (i === 0) ctx.moveTo(v.x, v.y)
        else ctx.lineTo(v.x, v.y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Radial satin pleats
      ctx.strokeStyle = 'rgba(92, 24, 40, 0.45)'
      ctx.lineWidth = 1
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI * 2) / 10
        ctx.beginPath()
        ctx.moveTo(0, baseTopY)
        ctx.lineTo(Math.cos(ang) * RX * 0.85, baseTopY + Math.sin(ang) * RY * 0.85)
        ctx.stroke()
      }

      // Pentagonal Famous Wizard Card inside box
      ctx.save()
      ctx.translate(0, baseTopY - (isUnboxedHatch ? 8 : 2))
      ctx.fillStyle = '#1d3266'
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const v = pVert(i, RX * 0.62, RY * 0.62, 0)
        if (i === 0) ctx.moveTo(v.x, v.y)
        else ctx.lineTo(v.x, v.y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // Glossy 3D Sculpted Dark-Chocolate Frog crouching inside!
      const frogHop = isUnboxedHatch ? Math.abs(Math.sin(t * 4.5)) * 6 : 0
      ctx.save()
      ctx.translate(0, baseTopY - 3 - frogHop)
      const chocoGrad = ctx.createRadialGradient(-4, -4, 1, 0, 0, 14)
      chocoGrad.addColorStop(0, '#7c3f1d')
      chocoGrad.addColorStop(0.55, '#47210c')
      chocoGrad.addColorStop(1, '#240f04')
      ctx.fillStyle = chocoGrad
      // Frog hind legs
      ctx.beginPath()
      ctx.ellipse(-9, 2, 5, 3.2, -0.4, 0, Math.PI * 2)
      ctx.ellipse(9, 2, 5, 3.2, 0.4, 0, Math.PI * 2)
      ctx.fill()
      // Frog crouched body & head
      ctx.beginPath()
      ctx.ellipse(0, 0, 9.5, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      // Bulging glossy chocolate eyes
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(-4, -4, 1.6, 0, Math.PI * 2)
      ctx.arc(4, -4, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // === 4. CANONICAL SLIP-LID (5-SIDED SKIRT + 5-FACET PENTAGONAL PYRAMID ROOF) ===
    ctx.save()
    ctx.translate(0, -lidLift)
    ctx.rotate(lidTilt)

    const lidSkirtBotY = 5
    const lidEaveY = -4
    const apexX = 0
    const apexY = -22 // Central 5-facet pyramid peak!

    // 4a. Lid Skirt Vertical Rim (3 front-facing sides)
    wallEdges.forEach(({ a, b, col1, col2 }) => {
      const tA = pVert(a, RX, RY, lidEaveY)
      const tB = pVert(b, RX, RY, lidEaveY)
      const bA = pVert(a, RX, RY, lidSkirtBotY)
      const bB = pVert(b, RX, RY, lidSkirtBotY)

      const sGrad = ctx.createLinearGradient(tA.x, tA.y, bB.x, bB.y)
      sGrad.addColorStop(0, col1)
      sGrad.addColorStop(1, col2)
      ctx.fillStyle = sGrad
      ctx.beginPath()
      ctx.moveTo(tA.x, tA.y)
      ctx.lineTo(tB.x, tB.y)
      ctx.lineTo(bB.x, bB.y)
      ctx.lineTo(bA.x, bA.y)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = '#f5d27e'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    // 4b. 5 Triangular Sloped Pyramid Roof Facets meeting at (apexX, apexY)
    // Facet shading gives crisp 3D depth to the pentagonal pyramid
    const facetColors = [
      ['#3b2070', '#26134d'], // 0 -> 1 (Upper-right slope)
      ['#2d1659', '#1c0c3b'], // 1 -> 2 (Lower-right slope)
      ['#351b68', '#221047'], // 2 -> 3 (Front slope facing viewer)
      ['#462782', '#2c1657'], // 3 -> 4 (Lower-left slope, lit by key light)
      ['#4f2d91', '#331a63']  // 4 -> 0 (Upper-left slope, brightest key light)
    ]

    for (let i = 0; i < 5; i++) {
      const v1 = pVert(i, RX, RY, lidEaveY)
      const v2 = pVert((i + 1) % 5, RX, RY, lidEaveY)
      const [c1, c2] = facetColors[i]
      const fGrad = ctx.createLinearGradient(apexX, apexY, (v1.x + v2.x) / 2, (v1.y + v2.y) / 2)
      fGrad.addColorStop(0, c1)
      fGrad.addColorStop(1, c2)

      ctx.fillStyle = fGrad
      ctx.beginPath()
      ctx.moveTo(apexX, apexY)
      ctx.lineTo(v1.x, v1.y)
      ctx.lineTo(v2.x, v2.y)
      ctx.closePath()
      ctx.fill()
    }

    // 4c. Inner Stepped Gold Foil Pentagon Border & Beaded Trim on the Pyramid Roof
    for (const [scaleR, width, strokeCol] of [
      [0.98, 2.2, '#f5d27e'],
      [0.86, 1.1, '#fff0b8'],
      [0.76, 1.0, 'rgba(229, 188, 104, 0.65)']
    ]) {
      ctx.strokeStyle = strokeCol
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const v = pVert(i, RX * scaleR, RY * scaleR, lerp(apexY, lidEaveY, scaleR))
        if (i === 0) ctx.moveTo(v.x, v.y)
        else ctx.lineTo(v.x, v.y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // 4d. Canonical 5-Pointed Golden Star Filigree across the Pentagonal Pyramid Roof
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) {
      const rFactor = i % 2 === 0 ? 0.78 : 0.34
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const sx0 = Math.cos(a) * RX * rFactor
      const sy0 = lerp(apexY, lidEaveY, rFactor) + Math.sin(a) * RY * rFactor
      if (i === 0) ctx.moveTo(sx0, sy0)
      else ctx.lineTo(sx0, sy0)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(245, 210, 126, 0.16)'
    ctx.fill()
    ctx.strokeStyle = '#f3cb78'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 4e. 5 Burnished Gold Pyramid Ridge Bars from Apex to the 5 Corners + Corner Medallions
    for (let i = 0; i < 5; i++) {
      const v = pVert(i, RX, RY, lidEaveY)
      ctx.strokeStyle = '#fde68a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(apexX, apexY)
      ctx.lineTo(v.x, v.y)
      ctx.stroke()

      // Corner gold flourish dot
      const vc = pVert(i, RX * 0.68, RY * 0.68, lerp(apexY, lidEaveY, 0.68))
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(vc.x, vc.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 4f. Center Apex Medallion with Golden Crest
    ctx.fillStyle = '#991b1b'
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(apexX, apexY + 2, 10.5, 7.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(apexX, apexY + 2, 3.2, 0, Math.PI * 2)
    ctx.fill()

    // 4g. Canonical Arched Cream-and-Gold Ribbon Banner ("HONEYDUKES / CHOCOLATE FROG") on Front Slope
    ctx.save()
    ctx.translate(0, lidEaveY + RY * 0.48)
    ctx.fillStyle = '#f7ebd2'
    ctx.strokeStyle = '#b88328'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.ellipse(0, 0, 23, 8.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = '#7a1f28'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(0, 0, 20.5, 6.4, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#7a1f28'
    ctx.font = '800 3.6px Cinzel, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('★ HONEYDUKES ★', 0, -3.2)

    ctx.fillStyle = '#231147'
    ctx.font = '900 5.4px Cinzel, Georgia, serif'
    ctx.fillText('CHOCOLATE FROG', 0, 1.8)
    ctx.restore()

    ctx.restore()
    ctx.restore()
  }

  // 4. Draw Clockwork Gear Gantry, Volumetric Aiming Beam & 3-Pronged Articulated Rune Claw
  function drawGantryAndClaw(hook, selected, toys, t) {
    const cx = cpx(hook.x)
    // Align claw descent height with the top row of the nearest column stack
    let activeTopRow = 4
    let bestDist = Infinity
    for (const toy of toys) {
      if (toy.state === 'collected') continue
      const colX = toy.homeX ?? toy.x
      const d = Math.abs(colX - hook.x)
      if (d < bestDist) {
        bestDist = d
        activeTopRow = Math.max(0, (toy.rows ?? 5) - 1)
      }
    }
    const descendFrac = clamp((1.65 - hook.y) / (1.65 - 0.08), 0, 1)
    const targetClawBottomY = cpy(0.08) - activeTopRow * ROW_STEP_Y
    const cy = lerp(cpy(1.65), targetClawBottomY, descendFrac)
    const railY = 232

    // Overhead Brass Gantry Rail Bar
    ctx.fillStyle = makeGoldGrad(180, railY - 5, 180, railY + 6)
    drawRoundedRect(182, railY - 5, 536, 10, 5)
    ctx.fill()
    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Helper to draw a rotating toothed clockwork gear
    function drawGear(gx, gy, radius, teeth, angle, color) {
      ctx.save()
      ctx.translate(gx, gy)
      ctx.rotate(angle)
      ctx.fillStyle = color
      ctx.strokeStyle = '#472a0e'
      ctx.lineWidth = 1.4
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2
        ctx.save()
        ctx.rotate(a)
        ctx.fillRect(-3, -radius - 4, 6, 6)
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#291509'
      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Clockwork Gear Carriage at (cx, railY)
    drawGear(cx - 18, railY - 2, 13, 10, gearAngle, '#d4a243')
    drawGear(cx + 16, railY + 2, 16, 12, -gearAngle * 0.8, '#f5d076')
    ctx.fillStyle = makeWoodGrad(cx - 26, railY - 10, cx + 26, railY + 12)
    drawRoundedRect(cx - 26, railY - 9, 52, 18, 7)
    ctx.fill()
    ctx.strokeStyle = '#f5d076'
    ctx.lineWidth = 2
    ctx.stroke()

    // Golden Chain / Telescoping Rod with Coiled Spring
    ctx.strokeStyle = makeGoldGrad(cx - 4, railY, cx + 4, cy)
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(cx, railY + 9)
    ctx.lineTo(cx, cy)
    ctx.stroke()

    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 1.6
    for (let sy = railY + 14; sy < Math.min(cy - 12, railY + 56); sy += 6) {
      ctx.beginPath()
      ctx.ellipse(cx, sy, 6, 2.2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 3-Pronged Articulated Mechanical Brass Claw Head
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(swingAngle)

    const openAngle = lerp(0.52, 0.10, hook.close)

    // Center-back 3rd prong for 3D depth
    ctx.save()
    ctx.strokeStyle = '#8c6220'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 14)
    ctx.lineTo(0, 48 + hook.close * 6)
    ctx.stroke()
    ctx.restore()

    // Left & Right Articulated Mechanical Brass Prongs
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.scale(side, 1)
      ctx.translate(10, 10)
      ctx.rotate(openAngle)

      ctx.strokeStyle = '#f5d076'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(20, 18)
      ctx.stroke()

      ctx.strokeStyle = '#d4a243'
      ctx.lineWidth = 5.5
      ctx.beginPath()
      ctx.moveTo(20, 18)
      ctx.quadraticCurveTo(22, 36, 4, 46)
      ctx.stroke()

      ctx.fillStyle = '#78350f'
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(20, 18, 4.2, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.restore()
    }

    // Cylindrical Brass Claw Housing & Glowing Rune Gem Core
    ctx.fillStyle = makeGoldGrad(-18, -6, 18, -6)
    drawRoundedRect(-17, -6, 34, 24, 9)
    ctx.fill()
    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 1.8
    ctx.stroke()

    ctx.fillStyle = '#6b1d20'
    drawRoundedRect(-13, -1, 26, 14, 5)
    ctx.fill()

    const coreColor = hook.close > 0.5 ? '#fbbf24' : '#f59e0b'
    ctx.save()
    ctx.fillStyle = coreColor
    ctx.shadowColor = coreColor
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(0, 6, 6.2 + Math.sin(t * 6) * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-2, 4, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }

  // 5. Draw 4 Turned Baluster Pillars, Glowing Orbs, Lower Mahogany Base, 3D Joystick Deck & Prize Hatch
  function drawFramePillarsAndBase(hook, t) {
    // Beveled Enchanted Glass Reflection Streaks over Chamber
    ctx.save()
    ctx.fillStyle = 'rgba(255, 250, 230, 0.055)'
    ctx.beginPath()
    ctx.moveTo(192, 215); ctx.lineTo(238, 215); ctx.lineTo(186, 580); ctx.lineTo(176, 580)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(670, 215); ctx.lineTo(705, 215); ctx.lineTo(655, 580); ctx.lineTo(632, 580)
    ctx.closePath(); ctx.fill()
    ctx.restore()

    // Brass Chamber Frame Border
    ctx.strokeStyle = makeGoldGrad(172, 210, 728, 608)
    ctx.lineWidth = 6
    drawRoundedRect(174, 212, 552, 398, 8)
    ctx.stroke()

    // Left & Right Turned Wood-and-Brass Baluster Pillars
    for (const px0 of [146, 726]) {
      const colGrad = ctx.createLinearGradient(px0, 210, px0 + 28, 210)
      colGrad.addColorStop(0, '#26140c')
      colGrad.addColorStop(0.4, '#5e3822')
      colGrad.addColorStop(0.8, '#331c10')
      colGrad.addColorStop(1, '#1a0d07')
      ctx.fillStyle = colGrad
      drawRoundedRect(px0, 210, 28, 400, 8)
      ctx.fill()
      ctx.strokeStyle = '#9e7129'
      ctx.lineWidth = 1.5
      ctx.stroke()

      for (const ry of [232, 268, 398, 540, 582]) {
        ctx.fillStyle = makeGoldGrad(px0 - 3, ry, px0 + 31, ry)
        drawRoundedRect(px0 - 3, ry, 34, 7, 3.5)
        ctx.fill()
      }

      // Glowing Amber Crystal Finial Orbs on top corners of Cabinet
      const orbX = px0 + 14
      const orbY = 112
      const orbPulse = 1 + Math.sin(t * 3.2 + px0) * 0.08
      const orbGlow = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 32 * orbPulse)
      orbGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)')
      orbGlow.addColorStop(0.45, 'rgba(245, 158, 11, 0.45)')
      orbGlow.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = orbGlow
      ctx.beginPath(); ctx.arc(orbX, orbY, 32 * orbPulse, 0, Math.PI * 2); ctx.fill()

      ctx.fillStyle = makeGoldGrad(orbX - 12, orbY + 8, orbX + 12, orbY + 16)
      drawRoundedRect(orbX - 11, orbY + 9, 22, 7, 3)
      ctx.fill()

      const sphereGrad = ctx.createRadialGradient(orbX - 4, orbY - 4, 2, orbX, orbY, 13)
      sphereGrad.addColorStop(0, '#ffffff')
      sphereGrad.addColorStop(0.35, '#fde047')
      sphereGrad.addColorStop(0.8, '#d97706')
      sphereGrad.addColorStop(1, '#78350f')
      ctx.fillStyle = sphereGrad
      ctx.beginPath(); ctx.arc(orbX, orbY, 12.5, 0, Math.PI * 2); ctx.fill()
    }

    // Floor Shadow under the Cabinet
    ctx.fillStyle = 'rgba(15, 8, 4, 0.34)'
    ctx.beginPath()
    ctx.ellipse(450, 772, 340, 22, 0, 0, Math.PI * 2)
    ctx.fill()

    // 4 Carved Stepped Mahogany & Brass Corner Feet
    for (const fx of [154, 676]) {
      ctx.fillStyle = makeWoodGrad(fx, 736, fx, 770)
      drawRoundedRect(fx, 738, 70, 30, 10)
      ctx.fill()
      ctx.strokeStyle = '#b8862d'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = makeGoldGrad(fx + 4, 736, fx + 66, 736)
      drawRoundedRect(fx + 4, 735, 62, 6, 3)
      ctx.fill()
    }

    // Main Lower Mahogany Cabinet Base Box
    ctx.fillStyle = makeWoodGrad(138, 606, 138, 746)
    drawRoundedRect(140, 606, 620, 138, 16)
    ctx.fill()
    ctx.strokeStyle = '#d4a243'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = makeGoldGrad(130, 602, 770, 602)
    drawRoundedRect(132, 600, 636, 12, 6)
    ctx.fill()
    ctx.fillStyle = makeGoldGrad(134, 736, 766, 736)
    drawRoundedRect(136, 736, 628, 10, 5)
    ctx.fill()

    // === PROTRUDING FRONT-LEFT CONTROL DECK (Crystal Orb Joystick & Rune Cast Button) ===
    const dx = 172, dy = 626, dw = 336, dh = 96
    ctx.fillStyle = 'rgba(12, 6, 3, 0.45)'
    drawRoundedRect(dx + 4, dy + 8, dw, dh, 16)
    ctx.fill()

    const deckGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh)
    deckGrad.addColorStop(0, '#6b1d20')
    deckGrad.addColorStop(1, '#3b0d10')
    ctx.fillStyle = deckGrad
    drawRoundedRect(dx, dy, dw, dh, 16)
    ctx.fill()
    ctx.strokeStyle = makeGoldGrad(dx, dy, dx + dw, dy + dh)
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#f5d076'
    ctx.font = '18px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('✦', dx + dw / 2, dy + 42)
    ctx.font = '700 9.5px Cinzel, Georgia, serif'
    ctx.fillStyle = '#f3d285'
    ctx.fillText('DIAGON ALLEY · CONTROL DECK', dx + dw / 2, dy + 80)

    const jx = dx + 78, jy = dy + 52
    ctx.fillStyle = '#26120b'
    ctx.beginPath(); ctx.ellipse(jx, jy + 10, 28, 9, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = makeGoldGrad(jx - 22, jy, jx + 22, jy)
    ctx.beginPath(); ctx.ellipse(jx, jy + 6, 22, 7, 0, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#fde68a'
    ctx.font = '800 10px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('◀', jx - 38, jy + 8)
    ctx.fillText('▶', jx + 38, jy + 8)

    ctx.save()
    ctx.translate(jx, jy + 4)
    ctx.rotate(stickTilt)
    ctx.fillStyle = makeGoldGrad(-4, -32, 4, 0)
    drawRoundedRect(-4, -30, 8, 30, 3)
    ctx.fill()
    const orbG = ctx.createRadialGradient(-5, -38, 2, 0, -34, 17)
    orbG.addColorStop(0, '#fffbeb')
    orbG.addColorStop(0.35, '#fbbf24')
    orbG.addColorStop(0.8, '#b91c1c')
    orbG.addColorStop(1, '#450a0a')
    ctx.fillStyle = orbG
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(0, -34, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.restore()

    const bx = dx + dw - 78, by = dy + 50
    const pressed = !hook.aim ? 4 : 0
    ctx.fillStyle = '#26120b'
    ctx.beginPath(); ctx.ellipse(bx, by + 8, 32, 11, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = makeGoldGrad(bx - 26, by - 4 + pressed, bx + 26, by + 8 + pressed)
    ctx.strokeStyle = '#fff5cc'
    ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.ellipse(bx, by + pressed, 26, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#3b0d10'
    ctx.font = '900 9.5px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GẮP!', bx, by + 3.5 + pressed)

    // === ORNATE HINGED BRASS PRIZE COLLECTION HATCH (Front-Right of Base) ===
    const hx = 544, hy = 620, hw = 184, hh = 104
    ctx.fillStyle = makeGoldGrad(hx, hy, hx + hw, hy + hh)
    drawRoundedRect(hx, hy, hw, hh, 16)
    ctx.fill()
    ctx.strokeStyle = '#472a0e'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = '#120a07'
    drawRoundedRect(hx + 12, hy + 12, hw - 24, hh - 28, 11)
    ctx.fill()

    // Render unboxed Chocolate Frog Box inside the prize hatch window when opened!
    if (lastAward) {
      ctx.save()
      drawRoundedRect(hx + 12, hy + 12, hw - 24, hh - 28, 11)
      ctx.clip()
      const glow = ctx.createRadialGradient(hx + hw / 2, hy + 52, 4, hx + hw / 2, hy + 52, 56)
      if (lastAward.isZonk) {
        glow.addColorStop(0, 'rgba(192, 132, 252, 0.55)')
        glow.addColorStop(1, 'rgba(192, 132, 252, 0)')
      } else {
        glow.addColorStop(0, 'rgba(250, 204, 21, 0.55)')
        glow.addColorStop(1, 'rgba(250, 204, 21, 0)')
      }
      ctx.fillStyle = glow
      ctx.fillRect(hx + 12, hy + 12, hw - 24, hh - 28)

      const fakeBox = {
        ...lastAward,
        x: (hx + hw / 2 - 450) / 228,
        y: (568 - (hy + 66)) / 172,
        scale: 0.54,
        rz: Math.sin(t * (lastAward.isZonk ? 9 : 3.5)) * (lastAward.isZonk ? 0.11 : 0.05),
        state: 'falling'
      }
      drawChocolateFrogBoxOnCanvas(fakeBox, hook, t, true)

      const hatchImg = !lastAward.isZonk && (lastAward.isChest ? portraitImages.chest : portraitImages[lastAward.kind || 'bear'])
      if (hatchImg && hatchImg.complete && hatchImg.naturalWidth > 0) {
        ctx.drawImage(hatchImg, hx + hw / 2 - 26, hy + 34 + Math.sin(t * 4.5) * 2, 52, 52)
      }

      if (lastAward.badge) {
        ctx.fillStyle = lastAward.isZonk ? '#581c87' : '#451a03'
        ctx.strokeStyle = lastAward.isZonk ? '#e879f9' : '#fde047'
        ctx.lineWidth = 1.5
        drawRoundedRect(hx + 22, hy + 24, hw - 44, 18, 9)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#fffbeb'
        ctx.font = '800 9.5px "Be Vietnam Pro", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(lastAward.badge, hx + hw / 2, hy + 36)
      }
      ctx.restore()
    }

    ctx.fillStyle = '#472a0e'
    drawRoundedRect(hx + 18, hy + 14, hw - 36, 9, 4)
    ctx.fill()
    ctx.fillStyle = '#2b1608'
    ctx.font = '800 9.5px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✦ CỬA NHẬN HỘP SÔ-CÔ-LA ẾCH ✦', hx + hw / 2, hy + hh - 7)
  }

  // 6. Draw Cinematic 3D Pentagonal Chocolate Frog Box Unboxing Stage & Prize Inside the Box
  function drawPrizeInsideOpenBox(u, prizeOpen, t) {
    const bounce = Math.sin(t * 5.2) * 3.2
    const popScale = clamp(prizeOpen * 1.15 - Math.max(0, prizeOpen - 0.8) * 0.75, 0, 1.06)
    ctx.save()
    ctx.translate(0, lerp(14, -18 + bounce, prizeOpen))
    ctx.scale(popScale, popScale)

    const pId = u.prizeId || u.kind || 'bear'

    if (u.isZonk) {
      // === "LÊU LÊU!" PRANK BOX INTERIOR (Coiled Brass Spring + Cheeky Tongue Sign + Escaping Frog / Purple Weasley Smoke) ===
      // Coiled brass jack-in-the-box spring rising from the satin cushion
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2.6
      for (let sy = 22; sy >= -2; sy -= 5) {
        ctx.beginPath()
        ctx.ellipse(Math.sin(t * 14 + sy) * 1.8, sy, 9, 3.2, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Purple Weasley prank smoke puffs
      for (const [sx, sy, sr] of [[-24, 2, 11], [25, 0, 12], [-16, -14, 9], [18, -16, 10]]) {
        ctx.fillStyle = 'rgba(192, 132, 252, 0.45)'
        ctx.beginPath()
        ctx.arc(sx + Math.sin(t * 6 + sx) * 3, sy + Math.cos(t * 5 + sy) * 2, sr, 0, Math.PI * 2)
        ctx.fill()
      }

      // Wobbling prank medallion head on top of the spring
      ctx.save()
      ctx.rotate(Math.sin(t * 12) * 0.16)
      const headGrad = ctx.createRadialGradient(-4, -18, 2, 0, -14, 18)
      headGrad.addColorStop(0, '#fde047')
      headGrad.addColorStop(0.7, '#f59e0b')
      headGrad.addColorStop(1, '#b45309')
      ctx.fillStyle = headGrad
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(0, -14, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Cheeky winking eyes (> <)
      ctx.strokeStyle = '#3b0764'
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-9, -18); ctx.lineTo(-4, -15); ctx.lineTo(-9, -12)
      ctx.moveTo(9, -18); ctx.lineTo(4, -15); ctx.lineTo(9, -12)
      ctx.stroke()

      // Laughing mouth & big wiggling pink prank tongue ("Lêu lêu!")
      ctx.fillStyle = '#7f1d1d'
      ctx.beginPath()
      ctx.arc(0, -9, 7, 0, Math.PI)
      ctx.fill()

      ctx.fillStyle = '#fb7185'
      ctx.strokeStyle = '#be123c'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(Math.sin(t * 18) * 2.2, -3, 5.2, 7.5, Math.sin(t * 18) * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Mini parchment sign held above: "LÊU LÊU!"
      ctx.fillStyle = '#fef3c7'
      ctx.strokeStyle = '#9333ea'
      ctx.lineWidth = 1.5
      drawRoundedRect(-26, -42, 52, 15, 5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#6b21a8'
      ctx.font = '900 7.5px "Be Vietnam Pro", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('LÊU LÊU! 😝', 0, -32)
      ctx.restore()

      // Escaping 3D Chocolate Frog leaping away out the top-right!
      const leapX = 28 + prizeOpen * 26 + Math.sin(t * 10) * 3
      const leapY = -28 - prizeOpen * 24 + Math.cos(t * 10) * 3
      ctx.save()
      ctx.translate(leapX, leapY)
      ctx.rotate(-0.45)
      ctx.fillStyle = '#5c2c16'
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fde047'
      ctx.font = 'bold 8px sans-serif'
      ctx.fillText('💨', -16, 4)
      ctx.restore()

      ctx.restore()
      return
    }

    if (u.isChest) {
      // === 3D GRINGOTTS TREASURE CHEST OVERFLOWING WITH GOLD GALLEONS (10–500 GALS) ===
      const chestAura = ctx.createRadialGradient(0, -10, 4, 0, -10, 48)
      chestAura.addColorStop(0, 'rgba(254, 240, 138, 0.95)')
      chestAura.addColorStop(0.55, 'rgba(234, 179, 8, 0.36)')
      chestAura.addColorStop(1, 'rgba(234, 179, 8, 0)')
      ctx.fillStyle = chestAura
      ctx.beginPath()
      ctx.arc(0, -10, 48, 0, Math.PI * 2)
      ctx.fill()

      // Erupting 3D Gold Galleon Coins & Gems orbiting the open Treasure Chest
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8 + t * 2.2
        const cx = Math.cos(ang) * (32 + Math.sin(t * 5 + i) * 5)
        const cy = -14 + Math.sin(ang) * 18 - Math.abs(Math.cos(t * 4 + i)) * 8
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(Math.cos(t * 6 + i), 1)
        ctx.fillStyle = '#facc15'
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.arc(0, 0, 5.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      const chestImg = portraitImages.chest
      if (chestImg && chestImg.complete && chestImg.naturalWidth > 0) {
        ctx.save()
        const chestBounce = Math.sin(t * 5.5) * 1.8
        ctx.translate(0, -12 + chestBounce)
        ctx.drawImage(chestImg, -44, -44, 88, 88)
        ctx.restore()
      } else {
        // Fallback sculpted 3D chest if image is still decoding
        ctx.fillStyle = '#5c2c16'
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 2
        drawRoundedRect(-24, -22, 48, 32, 6)
        ctx.fill()
        ctx.stroke()
      }

      // Floating Golden Amount Banner (+10..500 GALS!) above the chest
      const galsAmount = u.gals || 100
      ctx.save()
      ctx.translate(0, -48 + Math.sin(t * 6) * 2)
      ctx.fillStyle = '#451a03'
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 1.6
      drawRoundedRect(-34, -10, 68, 17, 8.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fef08a'
      ctx.font = '900 8.5px "Cinzel", "Be Vietnam Pro", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`+${galsAmount} GALS!`, 0, 1.5)
      ctx.restore()

      ctx.restore()
      return
    }

    // Optional bonus Wizarding Collectible behind/beside the creature inside the box
    if (pId === 'dumbledore') {
      // Gleaming Pentagonal Gold Dumbledore Wizard Card standing in the back of the box
      ctx.save()
      ctx.translate(-18, -10)
      ctx.rotate(-0.18 + Math.sin(t * 4) * 0.04)
      ctx.fillStyle = makeGoldGrad(-16, -20, 16, 16)
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        const vx = Math.cos(a) * 17
        const vy = Math.sin(a) * 16
        if (i === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#3b0764'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        const vx = Math.cos(a) * 13
        const vy = Math.sin(a) * 12
        if (i === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      }
      ctx.closePath()
      ctx.fill()

      // Dumbledore silhouette (pointed wizard hat + silver beard)
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.lineTo(0, 10); ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.lineTo(0, -12); ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (pId === 'beans') {
      // Striped Honeydukes Bertie Bott's Every Flavour Beans Box & colorful beans inside the tray
      ctx.save()
      ctx.translate(-19, -4)
      ctx.rotate(-0.15)
      ctx.fillStyle = '#fef3c7'
      ctx.strokeStyle = '#b91c1c'
      ctx.lineWidth = 1.4
      drawRoundedRect(-11, -14, 22, 24, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#dc2626'
      for (let sx = -8; sx <= 6; sx += 7) {
        ctx.fillRect(sx, -13, 3.5, 22)
      }
      ctx.restore()
      // Scattered glossy jelly beans in the satin cushion
      for (const [bx, by, bcol] of [[-22, 12, '#ef4444'], [-14, 15, '#22c55e'], [18, 14, '#38bdf8'], [24, 10, '#eab308']]) {
        ctx.fillStyle = bcol
        ctx.beginPath()
        ctx.ellipse(bx, by, 3.8, 2.4, 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (pId === 'felix') {
      // Glowing Liquid-Gold Felix Felicis Potion Phial inside the box
      ctx.save()
      ctx.translate(20, -6)
      ctx.rotate(0.16 + Math.sin(t * 5) * 0.04)
      const felixGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18)
      felixGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)')
      felixGlow.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = felixGlow
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill()

      ctx.fillStyle = '#fde047'
      ctx.strokeStyle = '#fef9c3'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(-4, -12); ctx.lineTo(4, -12)
      ctx.quadraticCurveTo(10, 4, 0, 12)
      ctx.quadraticCurveTo(-10, 4, -4, -12)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#92400e'
      drawRoundedRect(-3.5, -16, 7, 4.5, 1.5)
      ctx.fill()
      ctx.restore()
    }

    // === MAIN 3D FANTASTIC BEAST SITTING INSIDE THE OPEN CHOCOLATE FROG BOX ===
    const kind = u.kind || 'bear'
    const portraitImg = portraitImages[kind]
    const adultImg = portraitAdultImages[kind]
    if (u.showDualStage && portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0 && adultImg && adultImg.complete && adultImg.naturalWidth > 0) {
      ctx.save()
      const sway = Math.sin(t * 4.2) * 0.03
      ctx.translate(0, -14)
      ctx.rotate(sway)

      const auraG = ctx.createRadialGradient(0, -8, 6, 0, -8, 56)
      auraG.addColorStop(0, 'rgba(254, 240, 138, 0.9)')
      auraG.addColorStop(0.6, 'rgba(245, 158, 11, 0.3)')
      auraG.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = auraG
      ctx.beginPath()
      ctx.arc(0, -8, 56, 0, Math.PI * 2)
      ctx.fill()

      ctx.drawImage(portraitImg, -62, -44, 62, 62)
      ctx.drawImage(adultImg, -2, -54, 72, 72)

      ctx.fillStyle = '#fde047'
      ctx.font = '800 6.5px "Be Vietnam Pro", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🐣 BÉ CON → 🌟 TRƯỞNG THÀNH', 0, 24)
      ctx.restore()
      ctx.restore()
      return
    }
    if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
      // High-definition 3D Realistic-Chibi Portrait emerging from the satin cushion
      ctx.save()
      const sway = Math.sin(t * 4.5) * 0.04
      const breathe = 1 + Math.sin(t * 6.2) * 0.022
      ctx.translate(0, -14)
      ctx.rotate(sway)
      ctx.scale(breathe, 1 / breathe)

      // Soft warm rim-light halo behind the creature inside the box
      const auraG = ctx.createRadialGradient(0, -6, 6, 0, -6, 44)
      auraG.addColorStop(0, 'rgba(254, 240, 138, 0.85)')
      auraG.addColorStop(0.55, 'rgba(245, 158, 11, 0.28)')
      auraG.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = auraG
      ctx.beginPath()
      ctx.arc(0, -6, 44, 0, Math.PI * 2)
      ctx.fill()

      // Draw crisp 3D Realistic-Chibi creature artwork
      ctx.drawImage(portraitImg, -42, -50, 84, 84)
      ctx.restore()
      ctx.restore()
      return
    }

    if (kind === 'rabbit') {
      // 🦉 HEDWIG THE SNOWY OWL inside the box
      const wingFlap = Math.sin(t * 7) * 0.18
      // Left & Right Snowy Wings
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.scale(side, 1)
        ctx.translate(14, -2)
        ctx.rotate(wingFlap)
        ctx.fillStyle = '#f8fafc'
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.ellipse(4, 2, 9, 14, 0.25, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        ctx.restore()
      }
      // Plump Snowy Owl Body & Head
      const owlG = ctx.createRadialGradient(-4, -10, 2, 0, -4, 22)
      owlG.addColorStop(0, '#ffffff')
      owlG.addColorStop(0.75, '#f1f5f9')
      owlG.addColorStop(1, '#cbd5e1')
      ctx.fillStyle = owlG
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.ellipse(0, 2, 16, 17, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -14, 13.5, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()

      // Gryffindor Crimson & Gold Scarf
      ctx.fillStyle = '#991b1b'
      drawRoundedRect(-13, -5, 26, 6.5, 3)
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
      for (const sx of [-8, 0, 8]) ctx.fillRect(sx - 1.5, -5, 3, 6.5)

      // Big Amber Owl Eyes & Hooked Beak
      for (const ex of [-5.5, 5.5]) {
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath(); ctx.arc(ex, -15, 4.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.beginPath(); ctx.arc(ex, -15, 2.3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(ex - 1, -16.2, 1, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.moveTo(-2.5, -12); ctx.lineTo(2.5, -12); ctx.lineTo(0, -7.5); ctx.closePath()
      ctx.fill()

      // Hogwarts Letter with Red Wax Seal held in front
      ctx.save()
      ctx.translate(0, 8)
      ctx.rotate(-0.08)
      ctx.fillStyle = '#fef3c7'
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 1
      drawRoundedRect(-11, -6, 22, 13, 2)
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#dc2626'
      ctx.beginPath(); ctx.arc(0, 0.5, 3.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else if (kind === 'cat') {
      // 🐱 CROOKSHANKS THE GINGER KNEAZLE CAT inside the box
      // Fluffy swaying ginger tail
      ctx.save()
      ctx.translate(14, 4)
      ctx.rotate(Math.sin(t * 5) * 0.22)
      ctx.fillStyle = '#ea580c'
      ctx.beginPath()
      ctx.ellipse(6, -6, 6, 13, 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Plump Ginger Fur Body & Wide Cheek Ruffs
      const catG = ctx.createRadialGradient(-4, -10, 2, 0, -4, 22)
      catG.addColorStop(0, '#fdba74')
      catG.addColorStop(0.65, '#f97316')
      catG.addColorStop(1, '#c2410c')
      ctx.fillStyle = catG
      ctx.strokeStyle = '#7c2d12'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.ellipse(0, 3, 16, 16, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()

      // Pointed Tufted Ears
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(side * 12, -20)
        ctx.lineTo(side * 15, -31)
        ctx.lineTo(side * 4, -24)
        ctx.closePath()
        ctx.fill(); ctx.stroke()
      }

      // Wide Persian Head
      ctx.beginPath()
      ctx.ellipse(0, -14, 15.5, 12.5, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()

      // Golden Eyes & Grumpy-Cute Muzzle
      for (const ex of [-5.8, 5.8]) {
        ctx.fillStyle = '#fde047'
        ctx.beginPath(); ctx.arc(ex, -15, 3.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#1c1917'
        ctx.beginPath(); ctx.ellipse(ex, -15, 1.3, 3.2, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#fed7aa'
      ctx.beginPath(); ctx.ellipse(0, -10.5, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#9a3412'
      ctx.beginPath(); ctx.arc(0, -11.8, 2, 0, Math.PI * 2); ctx.fill()

      // Golden Bell Collar
      ctx.fillStyle = '#881337'
      drawRoundedRect(-11, -3, 22, 4.5, 2)
      ctx.fill()
      ctx.fillStyle = '#facc15'
      ctx.beginPath(); ctx.arc(0, 1.5, 3.8, 0, Math.PI * 2); ctx.fill()
    } else if (kind === 'bowtruckle') {
      // 🌿 BOWTRUCKLE PICKETT inside the box
      // Twig arms waving
      ctx.strokeStyle = '#65a30d'
      ctx.lineWidth = 3.2
      ctx.lineCap = 'round'
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.scale(side, 1)
        ctx.rotate(Math.sin(t * 6) * 0.14)
        ctx.beginPath()
        ctx.moveTo(6, -2); ctx.lineTo(19, -9); ctx.lineTo(24, -13)
        ctx.moveTo(19, -9); ctx.lineTo(25, -7)
        ctx.stroke()
        ctx.restore()
      }
      // Segmented green twig torso & head
      const bwG = ctx.createLinearGradient(-8, -24, 8, 16)
      bwG.addColorStop(0, '#a3e635')
      bwG.addColorStop(0.5, '#4d9b36')
      bwG.addColorStop(1, '#365314')
      ctx.fillStyle = bwG
      ctx.strokeStyle = '#1a2e05'
      ctx.lineWidth = 1.2
      drawRoundedRect(-7.5, -6, 15, 22, 6)
      ctx.fill(); ctx.stroke()
      drawRoundedRect(-10.5, -24, 21, 20, 9)
      ctx.fill(); ctx.stroke()

      // 2 Sprouting Green Crown Leaves on top of head
      for (const [lx, rot, col] of [[-5, -0.45, '#84cc16'], [6, 0.45, '#65a30d']]) {
        ctx.save()
        ctx.translate(lx, -25)
        ctx.rotate(rot + Math.sin(t * 5) * 0.1)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.ellipse(0, -7, 5, 9, 0, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        ctx.restore()
      }

      // Glossy Dark Brown Eyes
      for (const ex of [-4.5, 4.5]) {
        ctx.fillStyle = '#1c1917'
        ctx.beginPath(); ctx.arc(ex, -14, 3.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(ex - 0.9, -15, 1.1, 0, Math.PI * 2); ctx.fill()
      }
    } else if (kind === 'demiguise') {
      // 🔮 DEMIGUISE DOUGAL inside the box
      const dmG = ctx.createRadialGradient(-4, -10, 2, 0, -4, 24)
      dmG.addColorStop(0, '#ffffff')
      dmG.addColorStop(0.55, '#cbd5e1')
      dmG.addColorStop(1, '#64748b')
      ctx.fillStyle = dmG
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.ellipse(0, 3, 17, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(0, -14, 15.5, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // Huge Clairvoyant Sapphire-Blue Eyes
      for (const ex of [-5.8, 5.8]) {
        ctx.fillStyle = '#0284c7'
        ctx.beginPath(); ctx.arc(ex, -14.5, 4.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.beginPath(); ctx.arc(ex, -14.5, 2.3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#bae6fd'
        ctx.beginPath(); ctx.arc(ex - 1.2, -16, 1.3, 0, Math.PI * 2); ctx.fill()
      }

      // Glowing Prophecy Crystal Orb held on lap
      const orbG = ctx.createRadialGradient(-2, 4, 1, 0, 6, 9)
      orbG.addColorStop(0, '#ffffff')
      orbG.addColorStop(0.5, '#38bdf8')
      orbG.addColorStop(1, '#0369a1')
      ctx.fillStyle = orbG
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.arc(0, 6, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    } else if (kind === 'occamy') {
      // 🐉 OCCAMY SERPENT-BIRD inside the box
      // Feathered purple-and-gold wings
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.scale(side, 1)
        ctx.translate(13, -1)
        ctx.rotate(Math.sin(t * 7) * 0.2)
        ctx.fillStyle = '#9333ea'
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.ellipse(5, 0, 9, 13, 0.3, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        ctx.restore()
      }
      // Coiled Turquoise Scaled Body & Head
      const ocG = ctx.createLinearGradient(-12, -24, 12, 16)
      ocG.addColorStop(0, '#5eead4')
      ocG.addColorStop(0.5, '#0d9488')
      ocG.addColorStop(1, '#115e59')
      ctx.fillStyle = ocG
      ctx.strokeStyle = '#0f766e'
      ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.ellipse(0, 3, 15, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(0, -14, 13, 11.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // Swept Horned Plume Crest
      ctx.fillStyle = '#c084fc'
      ctx.strokeStyle = '#fde047'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(side * 6, -22); ctx.lineTo(side * 15, -31); ctx.lineTo(side * 11, -19); ctx.closePath()
        ctx.fill(); ctx.stroke()
      }

      // Golden Reptilian Eyes & Pure Silver Egg held in coils
      for (const ex of [-5, 5]) {
        ctx.fillStyle = '#fde047'
        ctx.beginPath(); ctx.arc(ex, -15, 3.4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.beginPath(); ctx.ellipse(ex, -15, 1.1, 2.8, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#e2e8f0'
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath(); ctx.ellipse(0, 6, 6.5, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    } else if (kind === 'puffskein') {
      // 🌸 PUFFSKEIN / PYGMY PUFF inside the box
      const pfG = ctx.createRadialGradient(-5, -10, 2, 0, -4, 24)
      pfG.addColorStop(0, '#fce7f3')
      pfG.addColorStop(0.5, '#f472b6')
      pfG.addColorStop(1, '#be185d')
      ctx.fillStyle = pfG
      ctx.strokeStyle = '#9d174d'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(0, -4, 19.5, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()

      // Big Sparkling Eyes & Long Curling Pink Tongue
      for (const ex of [-6.5, 6.5]) {
        ctx.fillStyle = '#1e1b4b'
        ctx.beginPath(); ctx.arc(ex, -8, 4.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(ex - 1.3, -9.5, 1.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.strokeStyle = '#fb7185'
      ctx.lineWidth = 3.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -1)
      ctx.quadraticCurveTo(3, 12, 11, 9)
      ctx.stroke()
    } else if (kind === 'phoenix') {
      // 🔥 FAWKES THE PHOENIX inside the box
      const flap = Math.sin(t * 8) * 0.24
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.scale(side, 1)
        ctx.translate(13, -2)
        ctx.rotate(flap)
        const wg = ctx.createLinearGradient(0, -12, 12, 14)
        wg.addColorStop(0, '#dc2626')
        wg.addColorStop(0.6, '#f59e0b')
        wg.addColorStop(1, '#fef08a')
        ctx.fillStyle = wg
        ctx.strokeStyle = '#7f1d1d'
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.ellipse(6, 0, 10, 15, 0.35, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        ctx.restore()
      }
      const phG = ctx.createRadialGradient(-4, -10, 2, 0, -4, 22)
      phG.addColorStop(0, '#fde047')
      phG.addColorStop(0.5, '#ef4444')
      phG.addColorStop(1, '#991b1b')
      ctx.fillStyle = phG
      ctx.strokeStyle = '#7f1d1d'
      ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.ellipse(0, 3, 15, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, -14, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // 3-Plume Golden Phoenix Crown Crest
      ctx.fillStyle = '#fde047'
      for (const [cxOff, cyTop] of [[-5, -31], [0, -34], [5, -31]]) {
        ctx.beginPath()
        ctx.moveTo(cxOff - 2, -24); ctx.lineTo(cxOff, cyTop); ctx.lineTo(cxOff + 2, -24); ctx.closePath()
        ctx.fill()
      }
      for (const ex of [-5, 5]) {
        ctx.fillStyle = '#1c1917'
        ctx.beginPath(); ctx.arc(ex, -15, 3.4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fef08a'
        ctx.beginPath(); ctx.arc(ex - 1, -16, 1.1, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.lineTo(0, -7); ctx.closePath()
      ctx.fill()
    } else {
      // 🪙 NIFFLER TREASURE HUNTER inside the box
      const nifG = ctx.createRadialGradient(-4, -10, 2, 0, -4, 24)
      nifG.addColorStop(0, '#475569')
      nifG.addColorStop(0.55, '#1e293b')
      nifG.addColorStop(1, '#090d16')
      ctx.fillStyle = nifG
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.3

      // Round Ears
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(side * 11, -23, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      // Pear-Shaped Velvety Body & Head
      ctx.beginPath(); ctx.ellipse(0, 3, 17, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, -14, 13.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // Beady Mischievous Eyes & Rosy Flat Platypus Bill
      for (const ex of [-5.2, 5.2]) {
        ctx.fillStyle = '#0f172a'
        ctx.beginPath(); ctx.arc(ex, -16.5, 2.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(ex - 0.8, -17.3, 1, 0, Math.PI * 2); ctx.fill()
      }
      const billG = ctx.createLinearGradient(-8, -14, 8, -7)
      billG.addColorStop(0, '#fecdd3')
      billG.addColorStop(1, '#e11d48')
      ctx.fillStyle = billG
      ctx.beginPath()
      ctx.ellipse(0, -10.5, 8.5, 4.8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Gleaming Gold Galleon Coin & Red Ruby held on belly
      ctx.fillStyle = '#facc15'
      ctx.strokeStyle = '#b45309'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(-3, 5, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.strokeStyle = '#fecaca'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(7, 0); ctx.lineTo(12, 5); ctx.lineTo(7, 10); ctx.lineTo(2, 5); ctx.closePath()
      ctx.fill(); ctx.stroke()
    }

    ctx.restore()
  }

  function drawUnboxingStageOnCanvas(u, t) {
    if (!u || !u.active) return

    const el = u.elapsed
    // 0.0s -> 0.45s: Box zooms from prize hatch (636, 668) to center stage (450, 468)
    const zoomK = clamp(el / 0.45, 0, 1)
    const smoothZoom = 1 - Math.pow(1 - zoomK, 3)
    const bx = lerp(636, 450, smoothZoom)
    const by = lerp(668, 468, smoothZoom)
    const sc = lerp(0.68, 2.45, smoothZoom)

    // 0.30s -> 0.62s: Anticipation shake before lid pops open
    const shakeWindow = el > 0.25 && el < 0.62 ? Math.sin(el * 55) * 0.075 : 0

    // 0.52s -> 1.12s: Pentagonal pyramid lid pops high open!
    const openK = clamp((el - 0.52) / 0.58, 0, 1)
    const smoothOpen = 1 - Math.pow(1 - openK, 3)

    // 0.62s -> 1.22s: Prize emerges up inside the open box!
    const prizeK = clamp((el - 0.62) / 0.58, 0, 1)
    const smoothPrize = 1 - Math.pow(1 - prizeK, 3)

    ctx.save()

    // 1. Magical Dimmed Spotlight Vignette over the Cabinet
    ctx.fillStyle = `rgba(10, 5, 18, ${0.72 * smoothZoom})`
    ctx.fillRect(0, 0, W, H)

    // 2. Rotating Golden / Purple Sunburst God-Rays behind the Opening Box
    const rayAlpha = smoothZoom * (0.45 + 0.35 * smoothOpen)
    ctx.save()
    ctx.translate(bx, by - 25)
    const burstGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, 260)
    if (u.isZonk) {
      burstGrad.addColorStop(0, `rgba(232, 121, 249, ${rayAlpha})`)
      burstGrad.addColorStop(0.5, `rgba(147, 51, 234, ${rayAlpha * 0.45})`)
      burstGrad.addColorStop(1, 'rgba(88, 28, 135, 0)')
    } else {
      burstGrad.addColorStop(0, `rgba(254, 240, 138, ${rayAlpha})`)
      burstGrad.addColorStop(0.5, `rgba(245, 158, 11, ${rayAlpha * 0.45})`)
      burstGrad.addColorStop(1, 'rgba(180, 83, 9, 0)')
    }
    ctx.fillStyle = burstGrad
    ctx.beginPath(); ctx.arc(0, 0, 260, 0, Math.PI * 2); ctx.fill()

    // 12 rotating light beams
    ctx.rotate(t * 0.45)
    ctx.fillStyle = u.isZonk ? 'rgba(240, 171, 252, 0.14)' : 'rgba(254, 240, 138, 0.16)'
    for (let i = 0; i < 12; i++) {
      ctx.save()
      ctx.rotate((i * Math.PI * 2) / 12)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-22, -230 * smoothZoom)
      ctx.lineTo(22, -230 * smoothZoom)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()

    // 3. Draw the Hero-Scale 3D Pentagonal Honeydukes Chocolate Frog Box Opening!
    const RX = 38
    const RY = 23
    const pVert = (i, rx = RX, ry = RY, yOff = 0) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
      return { x: Math.cos(a) * rx, y: Math.sin(a) * ry + yOff }
    }

    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(shakeWindow)
    ctx.scale(sc, sc)

    const baseTopY = 2
    const baseBotY = 18

    // 3a. Back/Interior Pleated Gold & Crimson Satin Cushion of the Open Box
    ctx.fillStyle = '#991b1b'
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const v = pVert(i, RX * 0.96, RY * 0.96, baseTopY)
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#d97706'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const v = pVert(i, RX * 0.82, RY * 0.82, baseTopY + 2)
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    ctx.fill()

    // 3b. Front Stepped Gold Bottom Rim Flange & Front 3 Pentagonal Base Walls
    ctx.fillStyle = makeGoldGrad(-RX, baseBotY, RX, baseBotY + 5)
    ctx.strokeStyle = '#5c3811'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const v = pVert(i, RX * 1.05, RY * 1.05, baseBotY + 2)
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    const wallEdges = [
      { a: 4, b: 3, col1: '#1a0b36', col2: '#120726' },
      { a: 1, b: 2, col1: '#180a30', col2: '#0f0520' },
      { a: 3, b: 2, col1: '#2b1454', col2: '#1c0c3b' }
    ]
    wallEdges.forEach(({ a, b, col1, col2 }) => {
      const tA = pVert(a, RX * 0.97, RY * 0.97, baseTopY)
      const tB = pVert(b, RX * 0.97, RY * 0.97, baseTopY)
      const bA = pVert(a, RX * 0.97, RY * 0.97, baseBotY)
      const bB = pVert(b, RX * 0.97, RY * 0.97, baseBotY)
      const wGrad = ctx.createLinearGradient(tA.x, tA.y, bB.x, bB.y)
      wGrad.addColorStop(0, col1)
      wGrad.addColorStop(1, col2)
      ctx.fillStyle = wGrad
      ctx.beginPath()
      ctx.moveTo(tA.x, tA.y); ctx.lineTo(tB.x, tB.y); ctx.lineTo(bB.x, bB.y); ctx.lineTo(bA.x, bA.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#e5bc68'
      ctx.lineWidth = 1.3
      ctx.stroke()
    })

    ctx.fillStyle = '#f5d27e'
    ctx.font = '700 4.8px Cinzel, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('✦ 70% WIZARDING COCOA ✦', 0, baseBotY + RY * 0.72 - 3)

    // 3c. THE PRIZE RISING PROUDLY OUT OF THE OPEN CHOCOLATE FROG BOX!
    if (smoothOpen > 0.08) {
      drawPrizeInsideOpenBox(u, smoothPrize, t)
    }

    // 3d. TELESCOPING 5-FACET PENTAGONAL PYRAMID LID LIFTING HIGH OPEN ABOVE THE BOX!
    const lidLift = smoothOpen * 94
    const lidTilt = -smoothOpen * 0.36
    const lidShiftX = -smoothOpen * 22

    ctx.save()
    ctx.translate(lidShiftX, -lidLift)
    ctx.rotate(lidTilt)

    const lidEaveY = 3
    const lidSkirtH = 5.5
    const apexX = 0
    const apexY = -18

    for (const [a, b] of [[4, 3], [1, 2], [3, 2]]) {
      const eA = pVert(a, RX * 1.04, RY * 1.04, lidEaveY)
      const eB = pVert(b, RX * 1.04, RY * 1.04, lidEaveY)
      const sA = pVert(a, RX * 1.04, RY * 1.04, lidEaveY + lidSkirtH)
      const sB = pVert(b, RX * 1.04, RY * 1.04, lidEaveY + lidSkirtH)
      ctx.fillStyle = makeGoldGrad(eA.x, eA.y, sB.x, sB.y)
      ctx.strokeStyle = '#5c3811'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(eA.x, eA.y); ctx.lineTo(eB.x, eB.y); ctx.lineTo(sB.x, sB.y); ctx.lineTo(sA.x, sA.y)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    }

    const roofFacets = [
      { a: 4, b: 0, c1: '#231047', c2: '#160930' },
      { a: 0, b: 1, c1: '#1e0d3d', c2: '#120729' },
      { a: 4, b: 3, c1: '#351969', c2: '#220e47' },
      { a: 1, b: 2, c1: '#281252', c2: '#180a36' },
      { a: 3, b: 2, c1: '#432082', c2: '#291154' }
    ]
    roofFacets.forEach(({ a, b, c1, c2 }) => {
      const vA = pVert(a, RX * 1.04, RY * 1.04, lidEaveY)
      const vB = pVert(b, RX * 1.04, RY * 1.04, lidEaveY)
      const fGrad = ctx.createLinearGradient(apexX, apexY, (vA.x + vB.x) / 2, (vA.y + vB.y) / 2)
      fGrad.addColorStop(0, c1)
      fGrad.addColorStop(1, c2)
      ctx.fillStyle = fGrad
      ctx.beginPath()
      ctx.moveTo(apexX, apexY); ctx.lineTo(vA.x, vA.y); ctx.lineTo(vB.x, vB.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#f5d27e'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    // 5-Pointed Gold Star & Honeydukes Ribbon on the Lifted Lid
    ctx.fillStyle = makeGoldGrad(-14, apexY - 8, 14, apexY + 8)
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 15 : 6.2
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const sx = apexX + Math.cos(a) * r
      const sy = apexY + 2 + Math.sin(a) * r * 0.68
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    }
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#991b1b'
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(apexX, apexY + 2, 8.5, 6, 0, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()

    ctx.save()
    ctx.translate(0, lidEaveY + RY * 0.48)
    ctx.fillStyle = '#f7ebd2'
    ctx.strokeStyle = '#b88328'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(0, 0, 23, 8, 0, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#7a1f28'
    ctx.font = '800 3.6px Cinzel, Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('★ HONEYDUKES ★', 0, -2.5)
    ctx.fillStyle = '#231147'
    ctx.font = '900 5.2px Cinzel, Georgia, serif'
    ctx.fillText('CHOCOLATE FROG', 0, 2.2)
    ctx.restore()

    ctx.restore() // end lid
    ctx.restore() // end scaled box

    // 4. Ornate Hogwarts Parchment Ribbon Banner Below the Open Box (showing the prize name right on the Canvas!)
    if (smoothOpen > 0.25) {
      const bannerAlpha = clamp((smoothOpen - 0.25) / 0.5, 0, 1)
      ctx.save()
      ctx.globalAlpha = bannerAlpha
      const banW = 470
      const banH = 68
      const banX = 450 - banW / 2
      const banY = 568

      ctx.fillStyle = u.isZonk ? 'rgba(59, 7, 100, 0.95)' : 'rgba(38, 16, 10, 0.95)'
      ctx.strokeStyle = u.isZonk ? '#e879f9' : '#f5d076'
      ctx.lineWidth = 3
      drawRoundedRect(banX, banY, banW, banH, 18)
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = u.isZonk ? 'rgba(240, 171, 252, 0.4)' : 'rgba(245, 208, 118, 0.4)'
      ctx.lineWidth = 1.2
      drawRoundedRect(banX + 6, banY + 6, banW - 12, banH - 12, 13)
      ctx.stroke()

      ctx.fillStyle = u.isZonk ? '#f0abfc' : '#fde047'
      ctx.font = '800 12px "Be Vietnam Pro", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(u.badge || '✦ HỘP SÔ-CÔ-LA ẾCH HONEYDUKES ✦', 450, banY + 25)

      ctx.fillStyle = '#fffbeb'
      ctx.font = '800 18px "Be Vietnam Pro", sans-serif'
      ctx.fillText(u.title || 'Mở hộp thành công!', 450, banY + 50)
      ctx.restore()
    }

    ctx.restore()
  }

  return {
    addToy(toy) {
      const group = document.createElementNS(NS, 'g')
      group.innerHTML = toyPortrait(toy.kind)
      toyLayer.append(group)
      lastAward = null
      unboxState = null
      prize.innerHTML = ''
      return group
    },
    removeToy(toy) {
      toy.mesh.remove()
    },
    clearUnbox() {
      unboxState = null
    },
    tease(zonkBox) {
      lastAward = {
        ...(zonkBox || { id: 99, kind: 'bear', scale: 0.75 }),
        isZonk: true,
        badge: zonkBox?.badge || '😝 LÊU LÊU! HỘP TRỐNG!'
      }
      unboxState = {
        ...lastAward,
        active: true,
        elapsed: 0,
        title: zonkBox?.title || 'Lêu lêu! Ếch nhảy trốn mất rồi! 😜'
      }
      for (let i = 0; i < 32; i++) {
        canvasSparks.push({
          x: 450,
          y: 430,
          vx: (Math.random() - 0.5) * 280,
          vy: -120 - Math.random() * 200,
          color: ['#c084fc', '#e879f9', '#fde047', '#f472b6'][i % 4],
          size: 4 + Math.random() * 5,
          life: 2.3,
          rot: Math.random() * Math.PI * 2
        })
      }
    },
    celebrate(wonToy) {
      if (wonToy) {
        lastAward = { ...wonToy, isZonk: false }
        unboxState = {
          ...lastAward,
          active: true,
          elapsed: 0,
          title: wonToy.title || 'Mở hộp Sô-cô-la Ếch thành công!'
        }
        prize.innerHTML = `<g transform="translate(414,484) scale(.5)">${toyPortrait(wonToy.kind)}</g>`
      }
      for (let i = 0; i < 28; i++) {
        const el = document.createElementNS(NS, 'rect')
        el.setAttribute('width', 5)
        el.setAttribute('height', 10)
        el.setAttribute('rx', 1)
        el.setAttribute('fill', ['#b8332a', '#e8b948', '#2f6f58', '#3c6e9c'][i % 4])
        svg.querySelector('#confetti').append(el)
        particles.push({
          el,
          x: 444,
          y: 485,
          vx: (Math.random() - 0.5) * 160,
          vy: -90 - Math.random() * 160,
          life: 2.5,
          rotation: Math.random() * 360
        })
      }
      for (let i = 0; i < 44; i++) {
        canvasSparks.push({
          x: 450,
          y: 430,
          vx: (Math.random() - 0.5) * 320,
          vy: -150 - Math.random() * 240,
          color: ['#fde047', '#b91c1c', '#10b981', '#38bdf8', '#f59e0b'][i % 5],
          size: 4 + Math.random() * 5.5,
          life: 2.6,
          rot: Math.random() * Math.PI * 2
        })
      }
    },
    render(dt, hook, toys, selected) {
      clockTime += dt

      // Update SVG DOM attributes for compatibility & tests
      const x = px(hook.x), y = py(hook.y)
      hookEl.setAttribute('transform', `translate(${x},${y})`)
      carriage.setAttribute('transform', `translate(${x},188)`)
      cable.setAttribute('x', x - 2.5)
      cable.setAttribute('height', Math.max(0, y - 190))
      const spread = lerp(31, 11, hook.close)
      left.setAttribute('d', `M-10 10 -${spread} 29 -${spread - 4} 45 -${spread - 11} 49 -${spread - 9} 42 -${spread - 6} 29 -5 14Z`)
      right.setAttribute('d', `M10 10 ${spread} 29 ${spread - 4} 45 ${spread - 11} 49 ${spread - 9} 42 ${spread - 6} 29 5 14Z`)
      ring.setAttribute('cx', x)
      ring.style.display = 'none'

      for (const toy of toys) {
        const scale = toy.scale * 0.72
        toy.mesh.setAttribute('transform', `translate(${px(toy.x)},${py(toy.y)}) rotate(${toy.rz * 180 / Math.PI}) scale(${scale}) translate(-60,-88)`)
        toy.mesh.style.display = toy.state === 'collected' ? 'none' : ''
        toy.mesh.classList.toggle('toy-held', toy.state === 'held')
        if (toy.state === 'held') toyLayer.append(toy.mesh)
        if (toy.state === 'collected' && lastAward !== toy) {
          prize.innerHTML = `<g transform="translate(414,484) scale(.5)">${toyPortrait(toy.kind)}</g>`
          lastAward = toy
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= dt; p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += dt * 100
        p.el.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${p.rotation})`)
        p.el.setAttribute('opacity', Math.min(1, p.life))
        if (p.life <= 0) { p.el.remove(); particles.splice(i, 1) }
      }

      // Render 3D-Lit HTML5 Canvas Scene when in browser
      if (!ctx) return

      const vx = (hook.x - prevHookX) / Math.max(dt, 0.001)
      const vy = (hook.y - prevHookY) / Math.max(dt, 0.001)
      prevHookX = hook.x
      prevHookY = hook.y

      // Pendulum claw physics & clockwork gear rotation
      swingVel += (-26 * swingAngle - 5.5 * swingVel - vx * 0.55) * dt
      swingAngle = clamp(swingAngle + swingVel * dt, -0.28, 0.28)
      gearAngle += (vx * 2.4 - vy * 1.8) * dt
      stickTilt = lerp(stickTilt, clamp(vx * 0.45, -0.38, 0.38), Math.min(1, dt * 12))

      ctx.clearRect(0, 0, W, H)
      drawCastleAndCrown(clockTime)
      drawChamberBackdrop(clockTime)

      // 1) Draw organic jumbled heap of 42 Chocolate Frog Boxes across 5 layers (sorted back-to-front by Y, filling left-to-right including right side)
      for (const hb of HEAP_BOXES) {
        const toy = toys[hb.toyIdx]
        if (!toy || toy.state === 'collected') continue
        const totalRows = toy.rows ?? 5
        const activeLayerReq = totalRows
        const isHeldOrFalling = toy.state === 'held' || toy.state === 'falling'
        // Skip the single active top box that is currently being lifted/dropped by the claw
        if (isHeldOrFalling && hb.rowReq === activeLayerReq && hb.x < 600) continue
        if (hb.rowReq > totalRows) continue
        const isTopLayer = hb.rowReq === activeLayerReq
        drawChocolateFrogBoxOnCanvas(
          toy,
          hook,
          clockTime,
          false,
          5 - hb.rowReq,
          isTopLayer,
          hb.y,
          hb.x,
          hb.rot,
          hb.sc,
          hb.beastKind
        )
      }

      // 1b) Draw foreground brass prize chute rail & opening so the chute mouth is always uncovered
      drawPrizeChuteForeground()

      // 2) Draw falling Chocolate Frog Box (if any)
      for (const toy of toys) {
        if (toy.state === 'falling') {
          const topR = Math.max(0, (toy.rows ?? 5) - 1)
          const fallY = cpy(toy.y) - (toy.x < 0.55 ? topR * ROW_STEP_Y : 0)
          drawChocolateFrogBoxOnCanvas(toy, hook, clockTime, false, topR, true, fallY, cpx(toy.x), toy.rz, 0.82)
        }
      }

      // 3) Draw held Chocolate Frog Box lifted by the claw
      for (const toy of toys) {
        if (toy.state === 'held') {
          const topR = Math.max(0, (toy.rows ?? 5) - 1)
          const startY = cpy(0) - topR * ROW_STEP_Y
          const liftFrac = clamp(toy.y / 1.51, 0, 1)
          const heldY = lerp(startY, cpy(1.51), liftFrac)
          drawChocolateFrogBoxOnCanvas(toy, hook, clockTime, false, topR, true, heldY, cpx(toy.x), swingAngle * 0.6, 0.82)
        }
      }

      drawGantryAndClaw(hook, selected, toys, clockTime)
      drawFramePillarsAndBase(hook, clockTime)

      // 4) Render 3D Pentagonal Chocolate Frog Box Unboxing Animation Stage & Prize Inside the Box!
      if (unboxState && unboxState.active) {
        unboxState.elapsed += dt
        drawUnboxingStageOnCanvas(unboxState, clockTime)
      }

      // Render celebratory magical sparks & confetti on Canvas
      for (let i = canvasSparks.length - 1; i >= 0; i--) {
        const s = canvasSparks[i]
        s.life -= dt
        s.vy += 240 * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.rot += dt * 5
        if (s.life <= 0) {
          canvasSparks.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rot)
        ctx.globalAlpha = Math.min(1, s.life)
        ctx.fillStyle = s.color
        ctx.fillRect(-s.size / 2, -s.size, s.size, s.size * 1.8)
        ctx.restore()
      }
    }
  }
}
