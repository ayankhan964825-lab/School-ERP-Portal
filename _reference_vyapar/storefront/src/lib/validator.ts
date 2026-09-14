import { z, ZodError } from 'zod';
import { logSystemError } from './error-logger';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errorResponse?: Response;
}

/**
 * Validates an incoming request payload against a Zod schema.
 * Automatically handles generating a 400 Bad Request response on failure,
 * and logs the validation failure as a system error for security auditing.
 * 
 * @param request The incoming Astro Request
 * @param schema The Zod Schema to validate against
 * @returns A ValidationResult containing either the strictly typed data or the Response to return.
 */
export async function validatePayload<T>(request: Request, schema: z.ZodSchema<T>): Promise<ValidationResult<T>> {
  let rawData;
  try {
    rawData = await request.json();
  } catch (err) {
    // Fails if payload is too large or not valid JSON
    return {
      success: false,
      errorResponse: new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), { status: 400 })
    };
  }

  try {
    const parsedData = schema.parse(rawData);
    return { success: true, data: parsedData };
  } catch (err) {
    if (err instanceof ZodError) {
      const errorDetails = err.issues.map(e => ({ path: e.path.join('.'), message: e.message }));
      
      // Log this validation failure as it could be a malicious attempt
      await logSystemError(
        'Payload Validation Failed', 
        { path: new URL(request.url).pathname, details: errorDetails, rawPayload: rawData }, 
        'VALIDATION_ERROR'
      );

      return {
        success: false,
        errorResponse: new Response(JSON.stringify({ 
          error: 'Validation Error', 
          details: errorDetails 
        }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      };
    }

    return {
      success: false,
      errorResponse: new Response(JSON.stringify({ error: 'Unknown validation error' }), { status: 500 })
    };
  }
}
