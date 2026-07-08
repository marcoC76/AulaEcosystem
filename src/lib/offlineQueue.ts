const QUEUE_KEY = 'offline_attendance_queue'
const MAX_RETRIES = 5

export interface QueueItem {
  id: string
  payload: Record<string, any>
  timestamp: number
  retries: number
}

function readQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(items: QueueItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Failed to write offline queue:', e)
  }
}

export function enqueue(payload: Record<string, any>): string {
  const queue = readQueue()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  queue.push({ id, payload, timestamp: Date.now(), retries: 0 })
  writeQueue(queue)
  return id
}

export function dequeueAll(): QueueItem[] {
  const items = readQueue()
  writeQueue([])
  return items
}

export function getQueueLength(): number {
  return readQueue().length
}

export function requeueOnFail(item: QueueItem): void {
  const queue = readQueue()
  item.retries++
  if (item.retries < MAX_RETRIES) {
    queue.push(item)
    writeQueue(queue)
  } else {
    console.warn(`[OfflineQueue] Discarding attendance after ${MAX_RETRIES} retries: ${item.id}`)
  }
}

export function clearQueue(): void {
  writeQueue([])
}
