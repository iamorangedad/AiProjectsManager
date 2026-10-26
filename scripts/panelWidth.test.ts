import assert from 'node:assert/strict'
import { DETAILS_MAX_FRACTION, SIDEBAR_MAX_FRACTION, clampPanelWidth, panelMaxWidth, widthFromDrag } from '../src/canvas/panelWidth.ts'

assert.equal(panelMaxWidth(1440, DETAILS_MAX_FRACTION), 720)
assert.equal(panelMaxWidth(1000, DETAILS_MAX_FRACTION), 500)
assert.equal(panelMaxWidth(1440, SIDEBAR_MAX_FRACTION), 360)
assert.equal(panelMaxWidth(1000, SIDEBAR_MAX_FRACTION), 250)

assert.equal(clampPanelWidth(300, 220, 1440, SIDEBAR_MAX_FRACTION), 300)
assert.equal(clampPanelWidth(100, 220, 1440, SIDEBAR_MAX_FRACTION), 220)
assert.equal(clampPanelWidth(900, 220, 1440, SIDEBAR_MAX_FRACTION), 360)
assert.equal(clampPanelWidth(800, 340, 1440, DETAILS_MAX_FRACTION), 720)
assert.equal(clampPanelWidth(400, 340, 600, DETAILS_MAX_FRACTION), 300)

assert.equal(widthFromDrag(220, 100, 180, 'east'), 300)
assert.equal(widthFromDrag(340, 500, 400, 'west'), 440)
assert.equal(widthFromDrag(340, 500, 560, 'west'), 280)

console.log('panelWidth ok')
