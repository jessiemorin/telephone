import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
  COOKIE_NAME,
  SESSION_DURATION,
  createSession,
  verifyPassword
} from '../../lib/server/auth.js';

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const origin = request.headers.get('origin');

    if (origin !== url.origin) {
      return fail(403, { error: 'Requête non autorisée.' });
    }

    const data = await request.formData();
    const password = data.get('password');

    if (typeof password !== 'string' || !verifyPassword(password)) {
      return fail(400, { error: 'Mot de passe incorrect.' });
    }

    cookies.set(COOKIE_NAME, createSession(), {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: SESSION_DURATION
    });

    redirect(303, '/');
  }
};
