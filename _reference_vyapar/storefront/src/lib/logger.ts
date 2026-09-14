import { storeContext } from './storeContext';

/**
 * Enterprise Structured Logger
 * Emits JSON formatted logs for easy ingestion into Datadog, CloudWatch, etc.
 */
class StructuredLogger {
  private formatLog(level: string, message: string, meta: Record<string, any> = {}) {
    const store = storeContext.getStore();
    const storeId = store?.storeId || 'platform';
    const timestamp = new Date().toISOString();

    const logEntry = {
      level,
      timestamp,
      storeId,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, meta?: Record<string, any>) {
    console.log(this.formatLog('INFO', message, meta));
  }

  warn(message: string, meta?: Record<string, any>) {
    console.warn(this.formatLog('WARN', message, meta));
  }

  error(message: string, error?: any, meta?: Record<string, any>) {
    let errMeta: any = {};
    if (error instanceof Error) {
      errMeta = { errorName: error.name, errorMessage: error.message, stack: error.stack };
    } else if (error !== undefined) {
      errMeta = { error };
    }
    
    console.error(this.formatLog('ERROR', message, { ...(meta || {}), ...errMeta }));
  }
}

export const logger = new StructuredLogger();
