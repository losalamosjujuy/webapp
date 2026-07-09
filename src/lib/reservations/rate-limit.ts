type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __reservationRateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalStore.__reservationRateLimitStore ?? new Map<string, RateLimitEntry>();
globalStore.__reservationRateLimitStore = store;

export function assertRateLimit({
  key,
  limit,
  windowMs
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (current.count >= limit) {
    throw new Error("Demasiados intentos. Espera un momento antes de volver a intentar.");
  }

  current.count += 1;
  store.set(key, current);
}
