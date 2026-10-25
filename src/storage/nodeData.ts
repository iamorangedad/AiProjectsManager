export type NodeKind = 'task' | 'model'

export interface AppNodeData {
  label: string
  url?: string
  percentage: number
  kind?: NodeKind
  profileId?: string
  model?: string
  prompt?: string
  output?: string
}

export function storedNodeData(data: Partial<AppNodeData> | undefined, fallbackLabel = 'Unnamed'): AppNodeData {
  const kind: NodeKind = data?.kind === 'model' ? 'model' : 'task'
  const base: AppNodeData = {
    label: (data?.label || fallbackLabel).trim() || fallbackLabel,
    url: data?.url?.trim() || undefined,
    percentage: Math.max(0, Math.min(100, Number(data?.percentage) || 0)),
  }
  if (kind !== 'model') return base
  return {
    ...base,
    kind,
    profileId: data?.profileId || undefined,
    model: data?.model?.trim() || undefined,
    prompt: data?.prompt || undefined,
    output: data?.output || undefined,
  }
}
