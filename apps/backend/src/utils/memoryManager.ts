/**
 * Lightweight Memory Manager for long-running processes
 * Ported from antigravity2api-nodejs
 * 
 * Features:
 * - Timed cleanup intervals (not memory-threshold based to avoid GC jitter)
 * - Object pool management
 * - Cleanup callback registration
 */

// Object pool size configuration
const POOL_SIZES = {
  chunk: 30,
  lineBuffer: 5,
  generic: 20,
};

type CleanupCallback = (reason: string) => void;

class MemoryManager {
  private cleanupCallbacks: Set<CleanupCallback> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number = 30 * 60 * 1000; // 30 minutes default
  private isShuttingDown: boolean = false;

  /**
   * Start the memory manager with periodic cleanup
   * @param cleanupIntervalMs - Interval between cleanups in milliseconds
   */
  start(cleanupIntervalMs: number = 30 * 60 * 1000): void {
    if (this.timer) return;
    this.setCleanupInterval(cleanupIntervalMs);
    this.isShuttingDown = false;
    console.log(`[MemoryManager] Started (interval: ${Math.round(this.cleanupIntervalMs / 1000)}s)`);
  }

  /**
   * Dynamically adjust the cleanup interval (hot-reloadable)
   * @param cleanupIntervalMs - New interval in milliseconds
   */
  setCleanupInterval(cleanupIntervalMs: number): void {
    if (Number.isFinite(cleanupIntervalMs) && cleanupIntervalMs > 0) {
      this.cleanupIntervalMs = Math.floor(cleanupIntervalMs);
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.timer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.cleanup('timer');
      }
    }, this.cleanupIntervalMs);

    // Don't keep the process alive just for cleanup
    this.timer.unref?.();
  }

  /**
   * Stop the memory manager
   */
  stop(): void {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cleanupCallbacks.clear();
    console.log('[MemoryManager] Stopped');
  }

  /**
   * Register a cleanup callback
   * @param callback - Function to call during cleanup
   */
  registerCleanup(callback: CleanupCallback): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Unregister a cleanup callback
   * @param callback - Previously registered callback
   */
  unregisterCleanup(callback: CleanupCallback): void {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Trigger a cleanup cycle
   * @param reason - Reason for cleanup (e.g., 'timer', 'manual', 'pressure')
   */
  cleanup(reason: string = 'manual'): void {
    for (const callback of this.cleanupCallbacks) {
      try {
        callback(reason);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[MemoryManager] Cleanup callback error:', message);
      }
    }
  }

  /**
   * Get object pool size configuration
   */
  getPoolSizes(): typeof POOL_SIZES {
    return { ...POOL_SIZES };
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    cleanupCallbackCount: number;
    isRunning: boolean;
    intervalMs: number;
  } {
    const mem = process.memoryUsage();
    return {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
      cleanupCallbackCount: this.cleanupCallbacks.size,
      isRunning: this.timer !== null,
      intervalMs: this.cleanupIntervalMs,
    };
  }
}

// Singleton instance
const memoryManager = new MemoryManager();

/**
 * Helper to register object pool cleanup
 * @param pool - Array used as object pool
 * @param getMaxSize - Function returning max pool size
 */
export function registerPoolCleanup<T>(
  pool: T[],
  getMaxSize: () => number
): void {
  memoryManager.registerCleanup(() => {
    const maxSize = getMaxSize();
    while (pool.length > maxSize) {
      pool.pop();
    }
  });
}

export { memoryManager, MemoryManager };
export default memoryManager;
