import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { COOKIE_NAME } from '../../lib/server/auth.js';

export const actions: Actions = {
  default: async ({ cookies, request, url }) => {
    if (request.headers.get('origin') !== url.origin) {
      return fail(403);
    }

    cookies.delete(COOKIE_NAME, { path: '/' });
    redirect(303, '/login');
  }
};
