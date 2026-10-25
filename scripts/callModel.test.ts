import assert from 'node:assert/strict'
import { buildChatMessages, buildChatRequest, readChatContent } from '../src/llm/callModel.ts'

const text = readChatContent({ choices: [{ message: { content: 'hello' } }] })
assert.equal(text, 'hello')

assert.throws(() => readChatContent({ choices: [] }), /no text/)
assert.throws(() => readChatContent(null), /unreadable/)

const chat = buildChatMessages(
  [
    { role: 'user', content: ' First ' },
    { role: 'assistant', content: 'one' },
    { role: 'user', content: 'Second' },
  ],
  'Answer in the same language.',
)
assert.deepEqual(chat, [
  { role: 'system', content: 'Answer in the same language.' },
  { role: 'user', content: 'First' },
  { role: 'assistant', content: 'one' },
  { role: 'user', content: 'Second' },
])

const request = buildChatRequest('mock', [{ role: 'user', content: 'Next step?' }], 'Stay brief.', [
  { id: 'parent', label: 'Research', kind: 'task', percentage: 40, url: 'https://example.com/spec', note: 'Read the spec first' },
  {
    id: 'mid',
    label: 'Outline',
    kind: 'model',
    percentage: 100,
    messages: [
      { role: 'user', content: 'Draft it' },
      { role: 'assistant', content: 'A short outline' },
    ],
  },
])
assert.equal(request.model, 'mock')
assert.equal(request.history.length, 2)
assert.equal(request.history[0].label, 'Research')
assert.match(request.messages[0].content, /Parent nodes:/)
assert.match(request.messages[0].content, /Research/)
assert.match(request.messages[0].content, /https:\/\/example.com\/spec/)
assert.match(request.messages[0].content, /Read the spec first/)
assert.match(request.messages[0].content, /A short outline/)
assert.equal(request.messages.at(-1)?.content, 'Next step?')

console.log('callModel ok')
