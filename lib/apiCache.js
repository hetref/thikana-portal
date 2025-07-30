// API Cache utility for recommendations and other frequently accessed data
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.requestCache = new Map(); // For deduplicating simultaneous requests
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate a cache key from parameters
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `${endpoint}?${sortedParams}`;
  }

  // Check if cached data is still valid
  isValid(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() < cacheEntry.expiresAt;
  }

  // Get cached data if valid
  get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const cacheEntry = this.cache.get(key);

    if (this.isValid(cacheEntry)) {
      console.log(`Cache HIT for ${key}`);
      return cacheEntry.data;
    }

    console.log(`Cache MISS for ${key}`);
    return null;
  }

  // Set data in cache with TTL
  set(endpoint, params = {}, data, ttl = this.defaultTTL) {
    const key = this.generateKey(endpoint, params);
    const cacheEntry = {
      data: data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      ttl: ttl,
    };

    this.cache.set(key, cacheEntry);
    console.log(`Cache SET for ${key}, expires in ${ttl}ms`);
  }

  // Invalidate specific cache entry
  invalidate(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
    console.log(`Cache INVALIDATED for ${key}`);
  }

  // Invalidate all cache entries matching a pattern
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        console.log(`Cache INVALIDATED for pattern ${pattern}: ${key}`);
      }
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.requestCache.clear();
    console.log("Cache CLEARED");
  }

  // Clean expired entries
  cleanup() {
    let cleanedCount = 0;
    for (const [key, entry] of this.cache) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    console.log(`Cache CLEANUP: removed ${cleanedCount} expired entries`);
  }

  // Get cache statistics
  getStats() {
    const totalEntries = this.cache.size;
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.cache) {
      if (this.isValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: totalEntries,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: this.hitRate || 0,
    };
  }

  // Deduplicate simultaneous requests to the same endpoint
  async dedupe(requestKey, requestFunction) {
    // If there's already a pending request for this key, return its promise
    if (this.requestCache.has(requestKey)) {
      console.log(`Request DEDUPED for ${requestKey}`);
      return this.requestCache.get(requestKey);
    }

    // Create and cache the request promise
    const requestPromise = requestFunction().finally(() => {
      // Remove from request cache when done
      this.requestCache.delete(requestKey);
    });

    this.requestCache.set(requestKey, requestPromise);
    return requestPromise;
  }
}

// Create singleton instance
const apiCache = new ApiCache();

// Enhanced fetch function with caching, retries, and deduplication
export const cachedFetch = async (url, options = {}, cacheOptions = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    forceRefresh = false,
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
  } = cacheOptions;

  // Extract endpoint and params for caching
  const urlObj = new URL(url);
  const endpoint = urlObj.pathname;
  const params = Object.fromEntries(urlObj.searchParams);

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = apiCache.get(endpoint, params);
    if (cachedData) {
      return cachedData;
    }
  }

  // Create request key for deduplication
  const requestKey = apiCache.generateKey(endpoint, params);

  // Deduplicate simultaneous requests
  return apiCache.dedupe(requestKey, async () => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the successful response
        apiCache.set(endpoint, params, data, ttl);

        return data;
      } catch (error) {
        lastError = error;
        console.warn(`Request attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on abort or certain HTTP errors
        if (
          error.name === "AbortError" ||
          (error.message.includes("HTTP 4") &&
            !error.message.includes("HTTP 429"))
        ) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  });
};

// Specialized function for recommendations API
export const fetchRecommendations = async (userId, options = {}) => {
  const {
    limit = 10,
    latitude,
    longitude,
    forceRefresh = false,
    ...otherOptions
  } = options;

  // Build URL
  const params = new URLSearchParams({ limit: limit.toString() });
  if (latitude && longitude) {
    params.append("latitude", latitude.toString());
    params.append("longitude", longitude.toString());
  }
  if (forceRefresh) {
    params.append("_t", Date.now().toString());
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL}/feed/${userId}?${params}`;

  return cachedFetch(
    url,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    {
      ttl: forceRefresh ? 1000 : 5 * 60 * 1000, // 1 second for force refresh, 5 minutes normal
      forceRefresh,
      ...otherOptions,
    }
  );
};

// Function to invalidate user-specific caches
export const invalidateUserCache = (userId) => {
  apiCache.invalidatePattern(`/feed/${userId}`);
  apiCache.invalidatePattern(`/business-recommendations/${userId}`);
  apiCache.invalidatePattern(`/who-to-follow/${userId}`);
};

// Function to invalidate location-based caches when location changes
export const invalidateLocationCache = () => {
  apiCache.invalidatePattern("latitude=");
  apiCache.invalidatePattern("longitude=");
};

// Periodic cleanup (run every 5 minutes)
if (typeof window !== "undefined") {
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

// Export the cache instance for direct access if needed
export { apiCache };

// Export cache management functions
export const cacheManager = {
  get: (endpoint, params) => apiCache.get(endpoint, params),
  set: (endpoint, params, data, ttl) =>
    apiCache.set(endpoint, params, data, ttl),
  invalidate: (endpoint, params) => apiCache.invalidate(endpoint, params),
  invalidatePattern: (pattern) => apiCache.invalidatePattern(pattern),
  clear: () => apiCache.clear(),
  cleanup: () => apiCache.cleanup(),
  getStats: () => apiCache.getStats(),
};
