import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { redis } from '../../../../lib/server/redis.js';
import type { RequestHandler } from './$types.js';

const ALLOWED_ROOTS = ['sounds', 'sounds-kids', 'voicemail'];

export const POST: RequestHandler = async ({ request, locals, url }) => {
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
    !ALLOWED_ROOTS.includes(root) ||
    typeof path !== 'string' ||
    path.length > 500 ||
    path.startsWith('/') ||
    path.split('/').some((part) => part === '..' || part === '.')
  ) {
    return json({ error: 'Invalid path' }, { status: 400 });
  }

  const id = randomUUID();

  await redis([
    'LPUSH',
    'nortel:commands',
    JSON.stringify({ id, type: 'list', root, path })
  ]);

  await redis(['EXPIRE', 'nortel:commands', 300]);

  return json({ id, status: 'queued' });
};
