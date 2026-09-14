import type { AstroCookies } from 'astro';

export function getCsrfToken(cookies: AstroCookies): string {
  if (cookies.has('csrf_token')) {
    return cookies.get('csrf_token')!.value;
  }
  const token = crypto.randomUUID();
  cookies.set('csrf_token', token, { 
    path: '/', 
    httpOnly: true, 
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' 
  });
  return token;
}

export function validateCsrfToken(request: Request, cookies: AstroCookies, tokenFromForm?: string | null): boolean {
  const cookieToken = cookies.get('csrf_token')?.value;
  if (!cookieToken) return false;
  
  // Check if token is in header or form data
  const headerToken = request.headers.get('x-csrf-token');
  
  return cookieToken === tokenFromForm || cookieToken === headerToken;
}
