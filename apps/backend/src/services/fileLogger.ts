import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { WriteStream } from 'fs';
import type { LogLevel, LogCategory, FileLogEntry, LogFileInfo } from '../types';

const LOG_DIR = join(homedir(), '.config', 'opencode', 'antigravity-dashboard', 'logs');

export class FileLogger {
  private logDir: string;
  private retentionDays: number;
  private currentDate: string = '';
  private currentStream: WriteStream | null = null;

  constructor(retentionDays: number = 7) {
    this.logDir = LOG_DIR;
    this.retentionDays = retentionDays;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getLogFilePath(date: string): string {
    return join(this.logDir, `${date}.log`);
  }

  private ensureStream(): void {
    const today = this.getDateString();
    
    if (this.currentDate !== today) {
      // Close old stream
      if (this.currentStream) {
        this.currentStream.end();
      }
      
      // Open new stream for today
      this.currentDate = today;
      this.currentStream = createWriteStream(this.getLogFilePath(today), { flags: 'a' });
      
      // Run cleanup on date change
      this.cleanup();
    }
  }

  /**
   * Log a message to the file
   */
  log(level: LogLevel, category: LogCategory, message: string, data?: Record<string, any>): void {
    this.ensureStream();
    
    const entry: FileLogEntry = {
      ts: Date.now(),
      level,
      cat: category,
      msg: message,
      ...(data ? { data } : {}),
    };
    
    try {
      this.currentStream?.write(JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('[FileLogger] Failed to write log:', error);
    }
  }

  // Convenience methods
  debug(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('DEBUG', category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('INFO', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('WARN', category, message, data);
  }

  error(category: LogCategory, message: string, data?: Record<string, any>): void {
    this.log('ERROR', category, message, data);
  }

  /**
   * Get list of available log files
   */
  getLogFiles(): LogFileInfo[] {
    this.ensureLogDir();
    
    const files: LogFileInfo[] = [];
    
    try {
      const entries = readdirSync(this.logDir);
      
      for (const entry of entries) {
        if (!entry.endsWith('.log')) continue;
        
        const filePath = join(this.logDir, entry);
        const stats = statSync(filePath);
        
        // Count lines (entries)
        let entryCount = 0;
        try {
          const content = readFileSync(filePath, 'utf-8');
          entryCount = content.split('\n').filter(line => line.trim()).length;
        } catch {
          entryCount = 0;
        }
        
        files.push({
          filename: entry,
          date: entry.replace('.log', ''),
          size: stats.size,
          entries: entryCount,
        });
      }
      
      // Sort by date descending (newest first)
      files.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('[FileLogger] Failed to list log files:', error);
    }
    
    return files;
  }

  /**
   * Read log entries from a specific file
   */
  readLogFile(filename: string, options?: { 
    tail?: number; 
    search?: string;
    level?: LogLevel;
    category?: LogCategory;
  }): FileLogEntry[] {
    const filePath = join(this.logDir, filename);
    
    if (!existsSync(filePath)) {
      return [];
    }
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      let lines = content.split('\n').filter(line => line.trim());
      
      // Parse JSON lines
      let entries: FileLogEntry[] = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }
      
      // Apply filters
      if (options?.level) {
        entries = entries.filter(e => e.level === options.level);
      }
      
      if (options?.category) {
        entries = entries.filter(e => e.cat === options.category);
      }
      
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        entries = entries.filter(e => 
          e.msg.toLowerCase().includes(searchLower) ||
          JSON.stringify(e.data || {}).toLowerCase().includes(searchLower)
        );
      }
      
      // Apply tail (get last N entries)
      if (options?.tail && options.tail > 0) {
        entries = entries.slice(-options.tail);
      }
      
      return entries;
    } catch (error) {
      console.error('[FileLogger] Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Cleanup old log files
   */
  cleanup(): number {
    this.ensureLogDir();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    let deletedCount = 0;
    
    try {
      const entries = readdirSync(this.logDir);
      
      for (const entry of entries) {
        if (!entry.endsWith('.log')) continue;
        
        const dateStr = entry.replace('.log', '');
        
        if (dateStr < cutoffStr) {
          const filePath = join(this.logDir, entry);
          unlinkSync(filePath);
          deletedCount++;
          console.log(`[FileLogger] Deleted old log file: ${entry}`);
        }
      }
    } catch (error) {
      console.error('[FileLogger] Cleanup failed:', error);
    }
    
    return deletedCount;
  }

  /**
   * Get the log directory path
   */
  getLogDirectory(): string {
    return this.logDir;
  }

  /**
   * Close the current stream
   */
  close(): void {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }
}

// Singleton instance
let fileLoggerInstance: FileLogger | null = null;

export function getFileLogger(retentionDays?: number): FileLogger {
  if (!fileLoggerInstance) {
    fileLoggerInstance = new FileLogger(retentionDays);
  }
  return fileLoggerInstance;
}
