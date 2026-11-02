import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { redis } from '../../../../lib/server/redis.js';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];
const CHUNK_SIZE = 128 * 1024;
const MAX_BATCH = 2;

export const POST: RequestHandler = async ({ request, locals, url }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.headers.get('origin') !== url.origin) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { root, path, index, count } = body ?? {};

  if (
    !ROOTS.includes(root) ||
    typeof path !== 'string' ||
    !path ||
    path.length > 500 ||
    path.startsWith('/') ||
    path.split('/').some((p) => !p || p === '.' || p === '..') ||
    !/\.(mp3|wav|ogg|m4a)$/i.test(path) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > 127 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > MAX_BATCH ||
    index + count > 128
  ) {
    return json({ error: 'Invalid audio batch request' }, { status: 400 });
  }

  const id = randomUUID();

  await redis([
    'LPUSH',
    'nortel:commands',
    JSON.stringify({
      id,
      type: 'audio-batch',
      root,
      path,
      index,
      count,
      chunkSize: CHUNK_SIZE
    })
  ]);

  await redis(['EXPIRE', 'nortel:commands', 300]);

  return json({ id, status: 'queued' });
};
