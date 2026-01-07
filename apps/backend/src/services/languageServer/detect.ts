/**
 * Language Server Detection
 * 
 * Orchestrates the detection of Antigravity Language Server processes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import { getPlatformStrategy } from './platforms';
import { testPort } from './httpClient';
import type { LanguageServerInfo, ProcessInfo, DetectOptions } from './types';

const execAsync = promisify(exec);

const DEFAULT_API_PATH = '/exa.language_server_pb.LanguageServerService/GetUserStatus';
const DEFAULT_HOST = '127.0.0.1';

export async function detectLanguageServer(options: DetectOptions = {}): Promise<LanguageServerInfo | null> {
  const { attempts = 3, baseDelay = 1500, verbose = false } = options;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (verbose) {
      console.log(`[LS Detect] Attempt ${attempt}/${attempts}...`);
    }

    try {
      const result = await tryDetect(verbose);
      if (result) {
        console.log(`[LS Detect] Found Language Server on port ${result.port} (attempt ${attempt})`);
        return result;
      }
    } catch (err) {
      if (verbose) {
        console.warn(`[LS Detect] Attempt ${attempt} failed:`, err);
      }
    }

    if (attempt < attempts) {
      const delay = baseDelay * Math.pow(1.5, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('[LS Detect] Language Server not found after all attempts');
  return null;
}

async function tryDetect(verbose: boolean): Promise<LanguageServerInfo | null> {
  const strategy = getPlatformStrategy();
  const command = strategy.getProcessListCommand();

  if (verbose) {
    console.log(`[LS Detect] Running: ${command}`);
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });

    if (stderr && verbose) {
      console.warn('[LS Detect] stderr:', stderr);
    }

    if (!stdout || stdout.trim().length === 0) {
      if (verbose) {
        console.log('[LS Detect] No matching processes found');
      }
      return null;
    }

    const processes = strategy.parseProcessInfo(stdout);

    if (verbose) {
      console.log(`[LS Detect] Found ${processes.length} candidate processes`);
    }

    if (processes.length === 0) {
      return null;
    }

    for (const proc of processes) {
      const result = await validateProcess(proc, verbose);
      if (result) {
        return result;
      }
    }

    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('exit code 1') || message.includes('Command failed')) {
      if (verbose) {
        console.log('[LS Detect] No matching processes (grep returned no matches)');
      }
      return null;
    }
    throw err;
  }
}

async function getListeningPorts(pid: number, verbose: boolean): Promise<number[]> {
  try {
    const { stdout } = await execAsync(`lsof -Pan -p ${pid} -i 2>/dev/null || ss -tlnp 2>/dev/null | grep "pid=${pid},"`, {
      timeout: 3000,
    });

    const ports: number[] = [];
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      const lsofMatch = line.match(/127\.0\.0\.1:(\d+).*\(LISTEN\)/);
      if (lsofMatch) {
        const port = parseInt(lsofMatch[1], 10);
        if (!ports.includes(port)) ports.push(port);
        continue;
      }

      const ssMatch = line.match(/LISTEN\s+\d+\s+\d+\s+(?:127\.0\.0\.1|\*):(\d+)/);
      if (ssMatch) {
        const port = parseInt(ssMatch[1], 10);
        if (!ports.includes(port)) ports.push(port);
        continue;
      }

      const localhostMatch = line.match(/localhost:(\d+).*\(LISTEN\)/);
      if (localhostMatch) {
        const port = parseInt(localhostMatch[1], 10);
        if (!ports.includes(port)) ports.push(port);
      }
    }

    if (verbose && ports.length > 0) {
      console.log(`[LS Detect] PID ${pid} listening on ports: ${ports.join(', ')}`);
    }

    return ports.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function testConnectPort(port: number, csrfToken: string): Promise<boolean> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' }
    });

    const req = https.request({
      hostname: DEFAULT_HOST,
      port,
      path: DEFAULT_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Connect-Protocol-Version': '1',
        'X-Codeium-Csrf-Token': csrfToken,
      },
      rejectUnauthorized: false,
      timeout: 2000,
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

async function validateProcess(proc: ProcessInfo, verbose: boolean): Promise<LanguageServerInfo | null> {
  if (verbose) {
    console.log(`[LS Detect] Testing PID ${proc.pid}, extensionPort ${proc.extensionPort}...`);
  }

  const listeningPorts = await getListeningPorts(proc.pid, verbose);
  
  if (listeningPorts.length === 0) {
    listeningPorts.push(proc.extensionPort);
  }

  for (const port of listeningPorts) {
    if (await testConnectPort(port, proc.csrfToken)) {
      if (verbose) {
        console.log(`[LS Detect] Found working HTTPS port: ${port}`);
      }
      return {
        port,
        csrfToken: proc.csrfToken,
        pid: proc.pid,
        protocol: 'https',
      };
    }
  }

  const testResult = await testPort(
    DEFAULT_HOST,
    proc.extensionPort,
    DEFAULT_API_PATH,
    {
      'Connect-Protocol-Version': '1',
      'X-Codeium-Csrf-Token': proc.csrfToken,
    },
    JSON.stringify({
      metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' },
    })
  );

  if (testResult.success) {
    if (verbose) {
      console.log(`[LS Detect] Validated via HTTP fallback. Protocol: ${testResult.protocol}`);
    }
    return {
      port: proc.extensionPort,
      csrfToken: proc.csrfToken,
      pid: proc.pid,
      protocol: testResult.protocol,
    };
  }

  if (verbose) {
    console.log(`[LS Detect] Validation failed: ${testResult.error || `HTTP ${testResult.statusCode}`}`);
  }

  return null;
}

export async function isLanguageServerRunning(): Promise<boolean> {
  try {
    const strategy = getPlatformStrategy();
    const command = strategy.getProcessListCommand();
    const { stdout } = await execAsync(command, { timeout: 5000 });
    const processes = strategy.parseProcessInfo(stdout || '');
    return processes.length > 0;
  } catch {
    return false;
  }
}
