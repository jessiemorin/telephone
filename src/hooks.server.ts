import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { COOKIE_NAME, verifySession } from './lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
  const authenticated = verifySession(event.cookies.get(COOKIE_NAME));
  const pathname = event.url.pathname;

  event.locals.authenticated = authenticated;

  if (!authenticated && pathname !== '/login') {
    redirect(303, '/login');
  }

  if (authenticated && pathname === '/login') {
    redirect(303, '/');
  }

  const response = await resolve(event);

  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
};
