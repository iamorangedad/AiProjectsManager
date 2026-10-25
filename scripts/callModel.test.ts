import assert from 'node:assert/strict'
import { buildChatMessages, readChatContent } from '../src/llm/callModel.ts'

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

console.log('callModel ok')
