import type { APIRoute } from 'astro';
import { runAutoAssign } from '../../../lib/autoAssign';

export const GET: APIRoute = async ({ request }) => {
  // Security check for cron jobs via Authorization header
  const authHeader = request.headers.get('authorization');
  const envSecret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;
  
  if (!envSecret || authHeader !== `Bearer ${envSecret}`) {
    console.warn('Unauthorized cron invocation attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await runAutoAssign();
  
  if (!result.success) {
    if (result.message === 'Database not configured') {
      return new Response(result.message, { status: 500 });
    }
    return new Response(JSON.stringify(result), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
