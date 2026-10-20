import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'
function boot() {
  const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true })
  const w = dom.window; let frame, time = 0
  w.requestAnimationFrame = callback => { frame = callback; return 1 }
  Object.defineProperty(w.performance, 'now', { value: () => time })
  const source = ['rules.js', 'art.js', 'scene.js', 'pets.js', 'main.js'].map(file => readFileSync(new URL(`../web/${file}`, import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '')).join('\n;\n')
  const context = dom.getInternalVMContext(); vm.runInContext(source, context)
  const tick = seconds => { for (let i = 0; i < seconds * 60; i++) { time += 1000 / 60; frame(time) } }
  tick(1)
  return { w, tick, dom, get: expr => vm.runInContext(expr, context), click: selector => w.document.querySelector(selector).click() }
}
test('2D scene is SVG only and a full centred round awards a saved prize', () => {
  const g = boot()
  assert.equal(g.w.document.querySelectorAll('canvas').length, 0)
  assert.equal(g.w.document.querySelectorAll('.arcade-art').length, 1)
  assert.equal(g.w.document.querySelector('#toys').children.length, 6)
  g.click('#dialog-action'); g.click('#grab'); g.tick(9)
  assert.equal(g.get('phase'), 'result')
  assert.equal(g.w.document.querySelector('#dialog-title').textContent, 'Gắp được rồi!')
  const saved = JSON.parse(g.w.localStorage.getItem('momo-claw.collection.v1'))
  assert.equal(Object.values(saved).reduce((a,b) => a+b, 0), 1)
  g.dom.window.close()
})
test('a miss does not award a prize and replay restores the timer', () => {
  const g = boot(); g.click('#dialog-action'); g.get('hook.x = 1.03'); g.click('#grab'); g.tick(6)
  assert.equal(g.get('phase'), 'result')
  assert.equal(g.w.document.querySelector('#dialog-title').textContent, 'Suýt nữa thôi!')
  assert.equal(g.get('Object.values(collection).reduce((a,b) => a+b, 0)'), 0)
  g.click('#dialog-action'); assert.equal(g.get('phase'), 'aim'); assert.equal(g.get('timeLeft'), 20)
  g.dom.window.close()
})
test('pause freezes both descent and round timing, then resumes', () => {
  const g = boot(); g.click('#dialog-action'); g.click('#grab'); g.tick(.4); g.click('#pause')
  const height = g.get('hook.y'), phase = g.get('phase')
  g.tick(3); assert.equal(g.get('hook.y'), height); assert.equal(g.get('phase'), phase)
  g.click('#dialog-action'); g.tick(9); assert.equal(g.get('phase'), 'result')
  g.dom.window.close()
})
test('countdown triggers automatic grab and refill keeps collected prizes', () => {
  const g = boot(); g.click('#dialog-action'); g.tick(21)
  assert.notEqual(g.get('phase'), 'aim'); g.tick(9)
  const count = g.get('collection.bear')
  assert.equal(count, 1)
  g.click('#refill'); assert.equal(g.get('toys.length'), 6); assert.equal(g.get('collection.bear'), count)
  g.dom.window.close()
})
test('won pets can be adopted once, renamed safely, cared for and saved', () => {
  const g = boot(); g.click('#dialog-action'); g.click('#grab'); g.tick(9); g.click('#dialog-home')
  assert.equal(g.w.document.querySelector('#arcade-view').hidden, true)
  g.click('[data-adopt="bear"]')
  assert.equal(g.w.document.querySelector('[data-adopt="bear"]').disabled, true)
  const input = g.w.document.querySelector('#rename-input'); input.value = '<b>Mochi</b>'
  g.w.document.querySelector('#rename-form').dispatchEvent(new g.w.Event('submit', { cancelable: true }))
  assert.equal(g.w.document.querySelector('#pet-name').textContent, '<b>Mochi</b>')
  assert.equal(g.w.document.querySelector('#pet-name b'), null)
  g.click('[data-care="feed"]'); g.tick(3)
  let state = JSON.parse(g.w.localStorage.getItem('momo-pets.v1'))
  assert.equal(state.pets.length, 1); assert.equal(state.pets[0].care, 1); assert.ok(state.pets[0].food > 90)
  g.click('[data-care="feed"]'); g.tick(3)
  state = JSON.parse(g.w.localStorage.getItem('momo-pets.v1')); assert.equal(state.pets[0].care, 1)
  g.click('[data-care="play"]'); g.tick(4); g.click('[data-care="sleep"]'); g.tick(6)
  assert.equal(g.w.document.querySelector('#room-plant').hidden, false)
  g.dom.window.close()
})
test('home pauses an ongoing claw round and ignores arcade keyboard input', () => {
  const g = boot(); g.click('#dialog-action'); g.tick(2); const time = g.get('timeLeft')
  g.click('#home-tab'); g.w.dispatchEvent(new g.w.KeyboardEvent('keydown', { key: 'd' })); g.tick(5)
  assert.equal(g.get('timeLeft'), time); assert.equal(g.get('keys.size'), 0)
  assert.equal(g.w.document.querySelector('#pet-empty').hidden, false)
  g.click('#arcade-tab'); assert.equal(g.get('paused'), true)
  g.click('#dialog-action'); g.tick(1); assert.ok(g.get('timeLeft') < time)
  g.dom.window.close()
})
