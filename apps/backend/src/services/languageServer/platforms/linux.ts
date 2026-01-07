/**
 * Linux Platform Strategy
 * 
 * Detects Antigravity Language Server processes on Linux/macOS
 */

import type { PlatformStrategy, ProcessInfo } from '../types';

export class LinuxStrategy implements PlatformStrategy {
  /**
   * Get command to list all processes with their full command lines
   * We look for the Antigravity Language Server process
   */
  getProcessListCommand(): string {
    // Use ps with full command line output (-ww for unlimited width)
    // Looking for language_server process with csrf_token (the actual arg names)
    return `ps -ww -eo pid,args | grep -E "(language_server|csrf_token)" | grep -v grep`;
  }

  /**
   * Parse process information from ps output
   * 
   * The Antigravity Language Server runs with arguments like:
   * language_server_linux_x64 --extension_server_port 36199 --csrf_token abc123 ...
   */
  parseProcessInfo(stdout: string): ProcessInfo[] {
    const processes: ProcessInfo[] = [];
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);

    for (const line of lines) {
      try {
        // ps -eo pid,args format: PID COMMAND...
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;

        const pid = parseInt(parts[0], 10);
        if (isNaN(pid)) continue;

        // The command and its arguments are everything from index 1 onwards
        const cmdline = parts.slice(1).join(' ');

        // Must be an Antigravity process (check for app_data_dir antigravity or path)
        if (!this.isAntigravityProcess(cmdline)) continue;

        // Extract extension_server_port (with underscore)
        const portMatch = cmdline.match(/--extension_server_port[=\s]+(\d+)/i);
        if (!portMatch) continue;
        const extensionPort = parseInt(portMatch[1], 10);
        if (isNaN(extensionPort) || extensionPort < 1000 || extensionPort > 65535) continue;

        // Extract csrf_token (with underscore)
        const tokenMatch = cmdline.match(/--csrf_token[=\s]+([a-zA-Z0-9_-]+)/i);
        if (!tokenMatch) continue;
        const csrfToken = tokenMatch[1];

        processes.push({
          pid,
          extensionPort,
          csrfToken,
          cmdline: cmdline.substring(0, 200), // Truncate for logging
        });
      } catch (err) {
        // Skip malformed lines
        continue;
      }
    }

    return processes;
  }

  /**
   * Check if command line belongs to an Antigravity process
   */
  private isAntigravityProcess(cmdline: string): boolean {
    const lowerCmd = cmdline.toLowerCase();
    // Check for --app_data_dir antigravity argument
    if (/--app_data_dir\s+antigravity\b/i.test(cmdline)) {
      return true;
    }
    // Check if path contains antigravity
    if (lowerCmd.includes('/antigravity/') || lowerCmd.includes('\\antigravity\\')) {
      return true;
    }
    // Check for language_server binary
    if (lowerCmd.includes('language_server_linux') || lowerCmd.includes('language_server_macos')) {
      return true;
    }
    return false;
  }
}

export class LinuxProcStrategy implements PlatformStrategy {
  getProcessListCommand(): string {
    return `for pid in $(pgrep -f "language_server"); do echo "PID:$pid CMD:$(cat /proc/$pid/cmdline 2>/dev/null | tr '\\0' ' ')"; done 2>/dev/null`;
  }

  parseProcessInfo(stdout: string): ProcessInfo[] {
    const processes: ProcessInfo[] = [];
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);

    for (const line of lines) {
      try {
        const pidMatch = line.match(/PID:(\d+)/);
        const cmdMatch = line.match(/CMD:(.+)/);
        
        if (!pidMatch || !cmdMatch) continue;

        const pid = parseInt(pidMatch[1], 10);
        const cmdline = cmdMatch[1];

        const portMatch = cmdline.match(/--extension_server_port[=\s]+(\d+)/i);
        if (!portMatch) continue;
        const extensionPort = parseInt(portMatch[1], 10);
        if (isNaN(extensionPort) || extensionPort < 1000 || extensionPort > 65535) continue;

        const tokenMatch = cmdline.match(/--csrf_token[=\s]+([a-zA-Z0-9_-]+)/i);
        if (!tokenMatch) continue;
        const csrfToken = tokenMatch[1];

        processes.push({
          pid,
          extensionPort,
          csrfToken,
          cmdline: cmdline.substring(0, 200),
        });
      } catch (err) {
        continue;
      }
    }

    return processes;
  }
}
