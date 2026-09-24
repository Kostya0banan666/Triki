export interface LogEntry {
  t: number;
  level: 'info' | 'warn' | 'error';
  msg: string;
}

type Listener = (entries: LogEntry[]) => void;

const MAX = 300;
const entries: LogEntry[] = [];
const listeners = new Set<Listener>();

export function log(msg: string, level: LogEntry['level'] = 'info'): void {
  entries.push({ t: Date.now(), level, msg });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  if (__DEV__) console.log(`[triki] ${msg}`);
  listeners.forEach((l) => l(entries));
}

export function subscribeLog(l: Listener): () => void {
  listeners.add(l);
  l(entries);
  return () => listeners.delete(l);
}

export function clearLog(): void {
  entries.length = 0;
  listeners.forEach((l) => l(entries));
}
