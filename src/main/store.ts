import Store from 'electron-store'

export type AppClassification = 'work' | 'distraction' | 'neutral'

interface StoreSchema {
  appClassifications: Record<string, AppClassification>
  seenApps: string[]
}

const store = new Store<StoreSchema>({
  defaults: {
    appClassifications: {},
    seenApps: []
  }
}) as Store<StoreSchema>

export function getClassification(appName: string): AppClassification {
  const all = store.get('appClassifications')
  return all[appName] ?? 'neutral'
}

export function setClassification(appName: string, kind: AppClassification): void {
  const all = { ...store.get('appClassifications') }
  if (kind === 'neutral') delete all[appName]
  else all[appName] = kind
  store.set('appClassifications', all)
}

export function listClassifications(): Record<string, AppClassification> {
  return store.get('appClassifications')
}

export function recordSeenApp(name: string): boolean {
  const seen = store.get('seenApps')
  if (seen.includes(name)) return false
  store.set('seenApps', [name, ...seen].slice(0, 50))
  return true
}

export function listSeenApps(): string[] {
  return store.get('seenApps')
}
