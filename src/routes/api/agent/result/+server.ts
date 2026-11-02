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
    Array.isArray(data.audioBatch) &&
    data.audioBatch.length >= 1 &&
    data.audioBatch.length <= 2 &&
    data.audioBatch.every((chunk: unknown) => {
      if (!chunk || typeof chunk !== 'object') return false;
      const c = chunk as Record<string, unknown>;

      return (
        typeof c.audio === 'string' &&
        c.audio.length <= 180000 &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(c.audio) &&
        Number.isInteger(c.index) &&
        Number(c.index) >= 0 &&
        Number.isInteger(c.total) &&
        Number(c.total) >= 1 &&
        Number(c.total) <= 128 &&
        Number(c.index) < Number(c.total) &&
        Number.isInteger(c.size) &&
        Number(c.size) > 0 &&
        Number(c.size) <= 16 * 1024 * 1024 &&
        typeof c.mime === 'string' &&
        ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'].includes(c.mime)
      );
    })
  ) {
    const chunks = data.audioBatch as Array<{
      audio: string;
      index: number;
      total: number;
      size: number;
      mime: string;
    }>;

    if (
      chunks.some(
        (c, i) =>
          c.total !== chunks[0].total ||
          c.size !== chunks[0].size ||
          c.mime !== chunks[0].mime ||
          c.index !== chunks[0].index + i
      )
    ) {
      return json(
        { error: 'Inconsistent audio batch' },
        { status: 400 }
      );
    }

    result = {
      status: 'done',
      audioBatch: chunks
    };
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
