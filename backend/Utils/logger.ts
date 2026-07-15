// Backend structured logger - Add to backend/Utils/logger.ts
import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data, error } = entry;
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      log += ` ${JSON.stringify(data)}`;
    }

    if (error) {
      log += ` Error: ${error.message}`;
      if (error.stack && process.env.NODE_ENV === 'development') {
        log += `\n${error.stack}`;
      }
    }

    return log;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...(error && {
        error: {
          message: error.message,
          ...(error.stack && { stack: error.stack }),
        },
      }),
    };

    const formatted = this.formatLog(entry);

    // Console output
    const consoleMethod = level === 'error' ? console.error : console.log;
    consoleMethod(formatted);

    // File output (optional - uncomment for production)
    // this.writeToFile(formatted);
  }

  private writeToFile(message: string): void {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `app-${today}.log`);

    fs.appendFileSync(logFile, `${message}\n`, 'utf-8');
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | string, data?: any): void {
    const err = typeof error === 'string'
      ? new Error(error)
      : error;

    this.log('error', message, data, err);
  }
}

export const logger = new Logger();
export default logger;
