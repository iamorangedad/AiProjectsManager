import assert from 'node:assert/strict'
import { storedNodeData } from '../src/storage/nodeData.ts'
import { collectParentHistory } from '../src/storage/parentHistory.ts'

const nodes = [
  { id: 'a', data: { label: 'Research', url: 'https://example.com/spec', percentage: 40, note: 'Read the spec first' } },
  {
    id: 'b',
    data: {
      label: 'Outline',
      percentage: 100,
      kind: 'model' as const,
      messages: [
        { role: 'user' as const, content: 'Draft it' },
        { role: 'assistant' as const, content: 'A short outline' },
      ],
      profileId: 'secret-profile',
    },
  },
  { id: 'c', data: { label: 'Design', percentage: 0, kind: 'model' as const } },
  { id: 'd', data: { label: 'Side note', percentage: 10 } },
]
const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'd', target: 'c' },
  { source: 'c', target: 'b' },
]

const history = collectParentHistory('c', nodes, edges)
assert.deepEqual(history.map((entry) => entry.label), ['Research', 'Outline', 'Side note'])
assert.equal(history[0].kind, 'task')
assert.equal(history[0].url, 'https://example.com/spec')
assert.equal(history[0].note, 'Read the spec first')
assert.equal(history[0].percentage, 40)
assert.equal(history[1].kind, 'model')
assert.deepEqual(history[1].messages, [
  { role: 'user', content: 'Draft it' },
  { role: 'assistant', content: 'A short outline' },
])
assert.equal(JSON.stringify(history).includes('secret-profile'), false)
assert.equal(collectParentHistory('a', nodes, edges).length, 0)

const saved = storedNodeData({
  label: 'Design',
  percentage: 100,
  kind: 'model',
  history,
  profileId: 'k1',
})
assert.equal(saved.history?.length, 3)
assert.equal(saved.history?.[1].messages?.[1].content, 'A short outline')

const task = storedNodeData({ label: 'Task', percentage: 0, history })
assert.equal(task.history, undefined)

console.log('parentHistory ok')
