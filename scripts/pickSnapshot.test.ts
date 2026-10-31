import assert from 'node:assert/strict'
import { pickSnapshot } from '../src/storage/pickSnapshot.ts'

const rich = [{ nodes: [{ id: 'n1' }], edges: [{ id: 'e1' }] }]
const empty = [{ nodes: [], edges: [] }]

const recovered = pickSnapshot([
  { data: empty, ts: 200, ok: true },
  { data: rich, ts: 100, ok: true },
])
assert.equal(recovered.readsOk, true)
assert.equal(recovered.projects?.[0].nodes.length, 1)

const newestWins = pickSnapshot([
  { data: rich, ts: 300, ok: true },
  { data: [{ nodes: [{ id: 'old' }, { id: 'older' }], edges: [] }], ts: 100, ok: true },
])
assert.equal(newestWins.projects?.[0].nodes.length, 1)

const failedRead = pickSnapshot([
  { data: null, ts: 0, ok: false },
  { data: rich, ts: 50, ok: true },
])
assert.equal(failedRead.readsOk, false)
assert.equal(failedRead.projects?.[0].nodes.length, 1)

const nothing = pickSnapshot([
  { data: null, ts: 0, ok: true },
  { data: null, ts: 0, ok: true },
])
assert.equal(nothing.projects, null)
assert.equal(nothing.readsOk, true)

const onlyEmpty = pickSnapshot([{ data: empty, ts: 10, ok: true }])
assert.equal(onlyEmpty.projects?.[0].nodes.length, 0)

console.log('pickSnapshot ok')
