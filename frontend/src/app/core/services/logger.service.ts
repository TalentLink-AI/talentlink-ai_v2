// frontend/src/app/core/services/logger.service.ts
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

export enum LogLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private level: LogLevel;
  private http = inject(HttpClient);
  private readonly serverLoggingUrl: string | null = null;

  constructor() {
    // Set log level based on environment
    this.level = environment.production ? LogLevel.WARN : LogLevel.DEBUG;
  }

  debug(message: string, ...data: any[]): void {
    this.logWith(LogLevel.DEBUG, message, data);
  }

  info(message: string, ...data: any[]): void {
    this.logWith(LogLevel.INFO, message, data);
  }

  warn(message: string, ...data: any[]): void {
    this.logWith(LogLevel.WARN, message, data);
  }

  error(message: string, ...data: any[]): void {
    this.logWith(LogLevel.ERROR, message, data);
  }

  trace(message: string, ...data: any[]): void {
    this.logWith(LogLevel.TRACE, message, data);
  }

  private getLabel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG]';
      case LogLevel.INFO:
        return '[INFO]';
      case LogLevel.WARN:
        return '[WARN]';
      case LogLevel.ERROR:
        return '[ERROR]';
      case LogLevel.TRACE:
        return '[TRACE]';
      default:
        return '[LOG]';
    }
  }

  private logWith(level: LogLevel, message: string, data: any[]): void {
    if (this.level < level) {
      return;
    }

    const label = this.getLabel(level);
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} ${label} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...data);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...data);
        break;
      case LogLevel.TRACE:
        console.trace(formattedMessage, ...data);
        break;
      default:
        console.log(formattedMessage, ...data);
    }

    // If server logging is enabled, send log to server
    if (this.serverLoggingUrl && level <= LogLevel.WARN) {
      const logEntry = {
        level: LogLevel[level],
        message,
        additional: data,
        timestamp,
      };
      this.http.post(this.serverLoggingUrl, logEntry).subscribe();
    }
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.level = level;
  }
}
