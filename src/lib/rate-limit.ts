/**
 * In-memory rate limiter with sliding window.
 *
 * Caveat: In Vercel serverless, each invocation may hit a different instance.
 * This provides defense-in-depth against single-instance brute force.
 * For multi-instance coordination, add Redis/DynamoDB-based rate limiting.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 300_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    // Remove entries where all timestamps have expired (older than max window)
    if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1] > 3600_000) {
      buckets.delete(key);
    }
  }
}

/**
 * Checks rate limit for a given key using sliding window.
 *
 * @param key - Unique identifier (e.g. "send-code:ip:1.2.3.4")
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns RateLimitResult with allowed status and metadata
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 3600_000,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(key, entry);
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const resetMs = oldest + windowMs - now;
    return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 1000) };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Rate limiter for verification code attempts (stricter — per-email, short window).
 */
export function checkVerifyRateLimit(email: string): RateLimitResult {
  const key = `verify-code:email:${email}`;
  return checkRateLimit(key, 5, 60_000); // 5 attempts per minute per email
}
