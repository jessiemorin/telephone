import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];

export const POST: RequestHandler = async ({ request, locals, url, fetch }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.headers.get('origin') !== url.origin) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const root = body?.root;
  const path = body?.path ?? '';

  if (
    !ROOTS.includes(root) ||
    typeof path !== 'string' ||
    path !== ''
  ) {
    return json({ error: 'Invalid path' }, { status: 400 });
  }

const apiUrl = process.env.NORTEL_API_URL;
const apiToken = process.env.NORTEL_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return json({ error: 'Nortel API not configured' }, { status: 503 });
  }

  try {
    const target = new URL('/files', apiUrl);
    target.searchParams.set('root', root);

    const response = await fetch(target.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return json(
        { error: 'Raspberry API unavailable', status: response.status },
        { status: 502 }
      );
    }

    return json(await response.json());
  } catch (error) {
    console.error('Nortel direct-list:', error);
    return json({ error: 'Raspberry connection failed' }, { status: 502 });
  }
};
