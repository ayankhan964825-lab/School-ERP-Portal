import { TABLES } from './constants';
import { supabaseAdmin } from './database';
import { getTenantId } from './storeContext';
import { logger } from './logger';

/**
 * Log a system error to the database.
 * @param error The error object
 * @param context Additional context like path, action, or payload
 * @param errorType Optional categorization of error (default 'UNHANDLED_EXCEPTION')
 */
export async function logSystemError(
  error: any,
  context: Record<string, any> = {},
  errorType: string = 'UNHANDLED_EXCEPTION'
) {
  try {
    // Attempt to get current storeId from context if available
    let storeId = context.storeId || null;
    if (!storeId) {
      try {
        storeId = getTenantId();
      } catch (e) {
        // Context lost, fallback to null (global error log)
        storeId = null;
      }
    }

    let errorMessage = 'Unknown Error';
    let stackTrace = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      stackTrace = error.stack || '';
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
    }

    const { error: dbError } = await supabaseAdmin.from(TABLES.SYSTEM_ERROR_LOGS).insert({
      store_id: storeId,
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
      context: context
    });

    if (dbError) {
      logger.error('Failed to write to system_error_logs:', dbError);
    }
  } catch (err) {
    // Ultimate fallback if logger itself crashes
    logger.error('System Error Logger crashed:', err);
  }
}
