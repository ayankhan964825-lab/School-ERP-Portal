import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('vyaparpe_rider_id', { path: '/' });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
