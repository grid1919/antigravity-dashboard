/**
 * Platform Strategy Router
 * 
 * Routes to the appropriate platform-specific detection strategy
 */

import type { PlatformStrategy } from '../types';
import { LinuxStrategy } from './linux';

/**
 * Get the appropriate platform strategy for the current OS
 */
export function getPlatformStrategy(): PlatformStrategy {
  const platform = process.platform;

  switch (platform) {
    case 'linux':
      return new LinuxStrategy();
    case 'darwin':
      // macOS uses similar commands to Linux
      return new LinuxStrategy();
    case 'win32':
      // Windows support can be added later
      console.warn('[Platform] Windows support not yet implemented, falling back to Linux strategy');
      return new LinuxStrategy();
    default:
      console.warn(`[Platform] Unknown platform ${platform}, falling back to Linux strategy`);
      return new LinuxStrategy();
  }
}

/**
 * Check if the current platform is supported
 */
export function isPlatformSupported(): boolean {
  const platform = process.platform;
  return ['linux', 'darwin'].includes(platform);
}
