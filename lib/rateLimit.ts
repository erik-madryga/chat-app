type Entry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Entry>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, retryAfter: 0 }
  }

  entry.count += 1
  if (entry.count > limit) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { limited: false, retryAfter: 0 }
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
