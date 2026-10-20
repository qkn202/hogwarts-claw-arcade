import { TYPES } from './rules.js'

let clipCounter = 0

export function toyPortrait(kind, stage = 'baby', animated = false) {
  const safeKind = Object.hasOwn(TYPES, kind) ? kind : 'bear'
  const t = TYPES[safeKind] || TYPES.bear
  const isAdult = stage === 'adult'
  const staticFile = isAdult ? `/beasts/${safeKind}.png` : `/beasts/${safeKind}_baby.png`
  const spriteFile = isAdult ? `/beasts/${safeKind}_walk.png` : `/beasts/${safeKind}_baby_walk.png`
  const sleepFile = isAdult ? `/beasts/${safeKind}_sleep.png` : `/beasts/${safeKind}_baby_sleep.png`
  const uid = `${safeKind}-${stage}-${++clipCounter}`
  const stripMarkup = animated
    ? `<g class="pet-strip-wrap" clip-path="url(#clip-${uid})">
          <image class="pet-sprite-strip" href="${spriteFile}" x="3" y="3" width="912" height="114" preserveAspectRatio="none"/>
        </g>
        <g class="pet-sleep-wrap" clip-path="url(#clip-${uid})">
          <image class="pet-sleep-strip" href="${sleepFile}" x="3" y="3" width="912" height="114" preserveAspectRatio="none"/>
        </g>`
    : ''

  return `<svg class="creature-svg creature-${safeKind} creature-stage-${isAdult ? 'adult' : 'baby'} ${animated ? 'has-strip' : ''}" width="120" height="130" viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="aura-${uid}" cx="50%" cy="48%" r="50%">
        <stop offset="0%" stop-color="${t.accent || '#facc15'}" stop-opacity="0.34"/>
        <stop offset="65%" stop-color="${t.blush || '#fde68a'}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${t.color || '#ffffff'}" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="clip-${uid}">
        <rect x="3" y="2" width="114" height="118" rx="12"/>
      </clipPath>
    </defs>
    <ellipse class="pet-shadow" cx="60" cy="120" rx="${isAdult ? 34 : 28}" ry="5.2" fill="#0f0704" opacity=".34"/>
    <circle cx="60" cy="62" r="52" fill="url(#aura-${uid})"/>
    <g class="pet-body-group">
      <g class="pet-tail"></g>
      <g class="pet-wing-l"></g>
      <g class="pet-wing-r"></g>
      <g class="pet-head">
        <g class="pet-ear-l"></g>
        <g class="pet-ear-r"></g>
        <image class="pet-static-img" href="${staticFile}" x="3" y="3" width="114" height="114" preserveAspectRatio="xMidYMid meet"/>
        ${stripMarkup}
        <g class="pet-eyes-open"></g>
        <g class="pet-prop"></g>
      </g>
      <g class="pet-foot-l"></g>
      <g class="pet-foot-r"></g>
    </g>
  </svg>`
}

export function wizardPortrait() {
  const uid = `wizard-${++clipCounter}`
  return `<svg class="creature-svg wizard-svg has-strip" width="125" height="142" viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="aura-${uid}" cx="50%" cy="48%" r="50%">
        <stop offset="0%" stop-color="#facc15" stop-opacity="0.38"/>
        <stop offset="65%" stop-color="#f59e0b" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="clip-${uid}">
        <rect x="3" y="2" width="114" height="118" rx="12"/>
      </clipPath>
    </defs>
    <ellipse class="pet-shadow" cx="60" cy="121" rx="30" ry="5.5" fill="#0f0704" opacity=".38"/>
    <circle cx="60" cy="62" r="50" fill="url(#aura-${uid})"/>
    <g class="pet-body-group">
      <g class="pet-head">
        <image class="pet-static-img" href="/beasts/wizard.png" x="3" y="3" width="114" height="114" preserveAspectRatio="xMidYMid meet"/>
        <g class="pet-strip-wrap" clip-path="url(#clip-${uid})">
          <image class="pet-sprite-strip" href="/beasts/wizard_walk.png" x="3" y="3" width="912" height="114" preserveAspectRatio="none"/>
        </g>
      </g>
    </g>
  </svg>`
}
