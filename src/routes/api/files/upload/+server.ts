import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { redis } from '../../../../lib/server/redis.js';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];
const CHUNK_SIZE = 64 * 1024;
const MAX_SIZE = 16 * 1024 * 1024;
const MAX_CHUNKS = MAX_SIZE / CHUNK_SIZE;

export const POST: RequestHandler = async ({ request, locals, url }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.headers.get('origin') !== url.origin) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  const {
    root,
    path,
    name,
    transferId,
    index,
    total,
    size,
    sha256,
    data
  } = body ?? {};

  const validPath = (value: unknown) =>
    typeof value === 'string' &&
    value.length <= 500 &&
    !value.startsWith('/') &&
    (value === '' ||
      value.split('/').every(
        (part) => part !== '' && part !== '.' && part !== '..'
      ));

  const validName =
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('\0') &&
    /\.(mp3|wav|ogg|m4a)$/i.test(name);

  const validNumbers =
    Number.isInteger(size) &&
    size > 0 &&
    size <= MAX_SIZE &&
    Number.isInteger(total) &&
    total === Math.ceil(size / CHUNK_SIZE) &&
    total <= MAX_CHUNKS &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < total;

  const expectedBytes = validNumbers
    ? Math.min(CHUNK_SIZE, size - index * CHUNK_SIZE)
    : 0;

  const validData =
    typeof data === 'string' &&
    data.length === Math.ceil(expectedBytes / 3) * 4 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(data) &&
    Buffer.from(data, 'base64').length === expectedBytes;

  if (
    !ROOTS.includes(root) ||
    !validPath(path) ||
    !validName ||
    typeof transferId !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(transferId) ||
    typeof sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(sha256) ||
    !validNumbers ||
    !validData
  ) {
    return json({ error: 'Invalid upload request' }, { status: 400 });
  }

  const id = randomUUID();

  await redis([
    'LPUSH',
    'nortel:commands',
    JSON.stringify({
      id,
      type: 'upload-chunk',
      root,
      path,
      name,
      transferId,
      index,
      total,
      size,
      sha256,
      data
    })
  ]);

  await redis(['EXPIRE', 'nortel:commands', 300]);

  return json({ id, status: 'queued' });
};
