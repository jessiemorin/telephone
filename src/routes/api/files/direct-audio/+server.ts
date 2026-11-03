import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];

export const GET: RequestHandler = async ({ url, locals, request, fetch }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const root = url.searchParams.get('root');
  const filename = url.searchParams.get('filename');

  if (
    !root || !ROOTS.includes(root) ||
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    !/\.(mp3|wav|ogg|m4a)$/i.test(filename)
  ) {
    return json({ error: 'Invalid file' }, { status: 400 });
  }

  const apiUrl = process.env.NORTEL_API_URL;
  const apiToken = process.env.NORTEL_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return json({ error: 'API not configured' }, { status: 503 });
  }

  try {
    const target = new URL('/files/audio', apiUrl);
    target.searchParams.set('root', root);
    target.searchParams.set('filename', filename);

    const headers = new Headers({
      Authorization: `Bearer ${apiToken}`
    });

    const range = request.headers.get('range');
    if (range) headers.set('Range', range);

    const upstream = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      return json(
        { error: 'Audio unavailable' },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const responseHeaders = new Headers();

    for (const name of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified'
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    responseHeaders.set('Cache-Control', 'private, no-store');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Direct audio:', error);
    return json({ error: 'Raspberry connection failed' }, { status: 502 });
  }
};
