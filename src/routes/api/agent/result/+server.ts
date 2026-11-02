import { json } from '@sveltejs/kit';
import { validAgent } from '../../../../lib/server/agent.js';
import { redis } from '../../../../lib/server/redis.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  if (!validAgent(request)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);

  if (
    !data ||
    typeof data.id !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(data.id) ||
    !['done', 'error'].includes(data.status)
  ) {
    return json({ error: 'Invalid result' }, { status: 400 });
  }

  let result: Record<string, unknown>;

  if (data.status === 'error') {
    if (typeof data.message !== 'string') {
      return json({ error: 'Invalid error' }, { status: 400 });
    }

    result = {
      status: 'error',
      message: data.message.slice(0, 200)
    };
  } else if (
    data.upload &&
    typeof data.upload === 'object' &&
    !Array.isArray(data.upload) &&
    Number.isInteger(data.upload.index) &&
    data.upload.index >= 0 &&
    data.upload.index < 256 &&
    typeof data.upload.complete === 'boolean'
  ) {
    result = {
      status: 'done',
      upload: {
        index: data.upload.index,
        complete: data.upload.complete
      }
    };
  } else if (data.message === 'pong') {
    result = { status: 'done', message: 'pong' };
  } else if (
    typeof data.audio === 'string' &&
    data.audio.length <= 180000 &&
    /^[A-Za-z0-9+/]*={0,2}$/.test(data.audio) &&
    Number.isInteger(data.index) &&
    data.index >= 0 &&
    Number.isInteger(data.total) &&
    data.total >= 1 &&
    data.total <= 128 &&
    data.index < data.total &&
    Number.isInteger(data.size) &&
    data.size >= 0 &&
    data.size <= 16 * 1024 * 1024 &&
    typeof data.mime === 'string' &&
    ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'].includes(data.mime)
  ) {
    result = {
      status: 'done',
      audio: data.audio,
      index: data.index,
      total: data.total,
      size: data.size,
      mime: data.mime
    };
  } else if (
    Array.isArray(data.files) &&
    data.files.length <= 500 &&
    data.files.every((file: unknown) => {
      if (!file || typeof file !== 'object') return false;
      const f = file as Record<string, unknown>;
      return (
        typeof f.name === 'string' &&
        f.name.length <= 255 &&
        typeof f.isDirectory === 'boolean' &&
        typeof f.size === 'number' &&
        Number.isFinite(f.size) &&
        typeof f.modified === 'string'
      );
    })
  ) {
    result = {
      status: 'done',
      files: data.files
    };
  } else {
    return json({ error: 'Invalid result' }, { status: 400 });
  }

  await redis([
    'SET',
    `nortel:result:${data.id}`,
    JSON.stringify(result),
    'EX',
    300
  ]);

  return json({ ok: true });
};
