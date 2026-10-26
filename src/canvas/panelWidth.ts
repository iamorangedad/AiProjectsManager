export const SIDEBAR_DEFAULT = 220
export const SIDEBAR_MIN = 220
export const DETAILS_DEFAULT = 340
export const DETAILS_MIN = 340

export function panelMaxWidth(viewportWidth: number): number {
  return Math.max(0, Math.floor(viewportWidth / 2))
}

export function clampPanelWidth(width: number, min: number, viewportWidth: number): number {
  const max = panelMaxWidth(viewportWidth)
  if (max < min) return max
  return Math.min(max, Math.max(min, width))
}

export function widthFromDrag(startWidth: number, startX: number, clientX: number, edge: 'east' | 'west'): number {
  const delta = clientX - startX
  return edge === 'east' ? startWidth + delta : startWidth - delta
}
