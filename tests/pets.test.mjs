import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPets } from '../web/pets.js'
const storage = value => ({ getItem: () => JSON.stringify(value) })
test('pet loading repairs corrupt stats, limits adoption and restores selection', () => {
  const pet = { id: 'one', kind: 'bear', name: 'Momo', food: -20, joy: 200, energy: null, care: -8 }
  const result = loadPets(storage({ pets: [pet, pet, { ...pet, id: 'two' }, { ...pet, id: 'three', kind: 'dragon' }], active: 'missing' }), { bear: 1, rabbit: 0, cat: 0 })
  assert.equal(result.pets.length, 1); assert.equal(result.active, 'one')
  assert.equal(result.pets[0].food, 0); assert.equal(result.pets[0].joy, 100); assert.equal(result.pets[0].energy, 75); assert.equal(result.pets[0].care, 0)
  assert.deepEqual(loadPets({ getItem: () => { throw Error() } }, {}), { pets: [], active: null })
})
test('loading has no offline stat penalty', () => {
  const pet = { id: 'one', kind: 'cat', name: 'Cookie', food: 67, joy: 53, energy: 81, care: 7 }
  assert.deepEqual(loadPets(storage({ pets: [pet], active: 'one' }), { cat: 1 }).pets[0], pet)
})
