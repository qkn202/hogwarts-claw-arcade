import test from 'node:test'
import assert from 'node:assert/strict'
import { findCatch, inPrizeChute, loadCollection, saveCollection, ease } from '../web/rules.js'
const toy = (id, x, state = 'free') => ({ id, x, radius: .23, state })
test('centred toy is caught; a miss is not magnetically corrected', () => {
  const a = toy(1, 0)
  assert.equal(findCatch([a], .1), a)
  assert.equal(findCatch([a], .25), null)
})
test('chooses nearest free prize, never a collected or held prize', () => {
  const a = toy(1, 0, 'collected'), b = toy(2, .1), c = toy(3, .18)
  assert.equal(findCatch([a, c, b], 0), b)
  assert.equal(findCatch([toy(4, 0, 'held')], 0), null)
})
test('chute requires horizontal position inside the opening', () => {
  assert.equal(inPrizeChute(.95), true)
  assert.equal(inPrizeChute(.5), false)
  assert.equal(inPrizeChute(1.3), false)
})
test('collection handles corrupt and unavailable storage', () => {
  assert.deepEqual(loadCollection({ getItem: () => '{broken' }), { bear: 0, rabbit: 0, cat: 0 })
  assert.deepEqual(loadCollection({ getItem: () => JSON.stringify({ bear: 2, rabbit: -1, cat: '3' }) }), { bear: 2, rabbit: 0, cat: 0 })
  assert.doesNotThrow(() => saveCollection({ setItem: () => { throw Error('blocked') } }, {}))
})
test('easing cannot overshoot a motion segment', () => {
  assert.equal(ease(-1), 0); assert.equal(ease(2), 1); assert.equal(ease(.5), .5)
})
