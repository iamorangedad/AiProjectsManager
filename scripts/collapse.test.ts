import assert from 'node:assert/strict'
import { hiddenDescendantIds, mergeDraggedNodes } from '../src/canvas/collapse.ts'

const edges = [
  { source: 'A', target: 'A1' },
  { source: 'A', target: 'A2' },
  { source: 'B', target: 'B1' },
]

const hidden = hiddenDescendantIds(edges, ['A'])
assert.deepEqual([...hidden].sort(), ['A1', 'A2'])
assert.equal(hidden.has('A'), false)
assert.equal(hidden.has('B'), false)
assert.equal(hidden.has('B1'), false)

const nested = hiddenDescendantIds(
  [
    { source: 'A', target: 'C' },
    { source: 'C', target: 'C1' },
  ],
  ['A'],
)
assert.deepEqual([...nested].sort(), ['C', 'C1'])

const cycle = hiddenDescendantIds(
  [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'A' },
  ],
  ['A'],
)
assert.equal(cycle.has('B'), true)
assert.equal(cycle.size < 5, true)

const nodes = [
  { id: 'A', position: { x: 80, y: 80 } },
  { id: 'A1', position: { x: 320, y: 20 } },
  { id: 'A2', position: { x: 320, y: 140 } },
  { id: 'B', position: { x: 80, y: 300 } },
  { id: 'B1', position: { x: 320, y: 300 } },
]
const merged = mergeDraggedNodes(nodes, [
  { id: 'A', position: { x: 80, y: 80 } },
  { id: 'B', position: { x: 80, y: 300 } },
  { id: 'B1', position: { x: 162, y: 108 } },
])
assert.deepEqual(merged.map((node) => node.id), ['A', 'A1', 'A2', 'B', 'B1'])
assert.deepEqual(merged.find((node) => node.id === 'A1')?.position, { x: 320, y: 20 })
assert.deepEqual(merged.find((node) => node.id === 'A2')?.position, { x: 320, y: 140 })
assert.deepEqual(merged.find((node) => node.id === 'B1')?.position, { x: 162, y: 108 })
assert.equal(merged.find((node) => node.id === 'A'), nodes[0])

console.log('collapse ok')
