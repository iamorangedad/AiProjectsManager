import assert from 'node:assert/strict'
import { readChatContent } from '../src/llm/callModel.ts'

const text = readChatContent({ choices: [{ message: { content: 'hello' } }] })
assert.equal(text, 'hello')

assert.throws(() => readChatContent({ choices: [] }), /no text/)
assert.throws(() => readChatContent(null), /unreadable/)

console.log('callModel ok')
