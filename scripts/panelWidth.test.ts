import assert from 'node:assert/strict'
import { clampPanelWidth, panelMaxWidth, widthFromDrag } from '../src/canvas/panelWidth.ts'

assert.equal(panelMaxWidth(1440), 720)
assert.equal(panelMaxWidth(1000), 500)

assert.equal(clampPanelWidth(300, 220, 1440), 300)
assert.equal(clampPanelWidth(100, 220, 1440), 220)
assert.equal(clampPanelWidth(900, 220, 1440), 720)
assert.equal(clampPanelWidth(800, 340, 1440), 720)
assert.equal(clampPanelWidth(400, 340, 600), 300)

assert.equal(widthFromDrag(220, 100, 180, 'east'), 300)
assert.equal(widthFromDrag(340, 500, 400, 'west'), 440)
assert.equal(widthFromDrag(340, 500, 560, 'west'), 280)

console.log('panelWidth ok')
