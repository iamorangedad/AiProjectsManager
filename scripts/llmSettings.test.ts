import assert from 'node:assert/strict'
import { normalizeProfiles, originPattern } from '../src/storage/llmSettings.ts'
import { storedNodeData } from '../src/storage/nodeData.ts'

const task = storedNodeData({
  label: 'A',
  percentage: 140,
  kind: 'task',
  prompt: 'secret',
  profileId: 'k',
  output: 'x',
  model: 'gpt',
  messages: [{ role: 'user', content: 'secret' }],
})
assert.equal(task.label, 'A')
assert.equal(task.percentage, 100)
assert.equal(task.kind, undefined)
assert.equal(task.prompt, undefined)
assert.equal(task.profileId, undefined)
assert.equal(task.output, undefined)
assert.equal(task.messages, undefined)
assert.equal(task.note, undefined)

const noted = storedNodeData({ label: 'A', percentage: 10, note: '  Keep this  ' })
assert.equal(noted.note, 'Keep this')

const model = storedNodeData({
  label: 'Model call',
  percentage: 0,
  kind: 'model',
  profileId: 'k1',
  model: 'deepseek-chat',
  messages: [
    { role: 'user', content: ' hi ' },
    { role: 'assistant', content: 'yo' },
    { role: 'system', content: 'skip me' },
  ],
})
assert.equal(model.kind, 'model')
assert.equal(model.profileId, 'k1')
assert.equal(model.model, 'deepseek-chat')
assert.deepEqual(model.messages, [
  { role: 'user', content: 'hi' },
  { role: 'assistant', content: 'yo' },
])
assert.equal(model.prompt, undefined)
assert.equal(model.output, undefined)
assert.equal('apiKey' in model, false)

const legacy = storedNodeData({ label: 'Old', percentage: 0, kind: 'model', prompt: 'Question', output: 'Answer' })
assert.deepEqual(legacy.messages, [
  { role: 'user', content: 'Question' },
  { role: 'assistant', content: 'Answer' },
])

const profiles = normalizeProfiles([
  { id: 'a', name: ' DeepSeek ', baseUrl: 'https://api.deepseek.com/v1/', apiKey: 'sk-test-key', model: 'deepseek-chat' },
  { nope: true },
  null,
])
assert.equal(profiles.length, 1)
assert.equal(profiles[0].name, 'DeepSeek')
assert.equal(profiles[0].apiKey, 'sk-test-key')
assert.equal(originPattern(profiles[0].baseUrl), 'https://api.deepseek.com/*')
assert.equal(originPattern('notaurl'), null)
assert.equal(originPattern('ftp://example.com/v1'), null)

assert.equal(storedNodeData({ label: 'U', percentage: 0, url: 'http://example.com' }).url, 'http://example.com')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: 'https://example.com' }).url, 'https://example.com')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: 'https://localhost:3000' }).url, 'https://localhost:3000')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: 'localhost:3000' }).url, 'http://localhost:3000')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: '127.0.0.1:8080/path' }).url, 'http://127.0.0.1:8080/path')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: 'example.com' }).url, 'https://example.com')
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: '  ' }).url, undefined)
const localUrl = storedNodeData({ label: 'U', percentage: 0, url: 'localhost:3000' }).url
assert.equal(storedNodeData({ label: 'U', percentage: 0, url: localUrl }).url, localUrl)

console.log('llmSettings ok')
