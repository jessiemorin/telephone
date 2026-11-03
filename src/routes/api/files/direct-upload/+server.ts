import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];
const MAX_SIZE = 4 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, url, fetch }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.headers.get('origin') !== url.origin) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (!Number.isFinite(contentLength) || contentLength <= 0 ||
      contentLength > MAX_SIZE + 16384) {
    return json({ error: 'Upload too large' }, { status: 413 });
  }

  const root = url.searchParams.get('root');
  if (!root || !ROOTS.includes(root)) {
    return json({ error: 'Invalid root' }, { status: 400 });
  }

  const apiUrl = process.env.NORTEL_API_URL;
  const apiToken = process.env.NORTEL_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return json({ error: 'API not configured' }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File) ||
        file.size === 0 ||
        file.size > MAX_SIZE ||
        !/\.(mp3|wav|ogg|m4a)$/i.test(file.name) ||
        file.name.includes('/') ||
        file.name.includes('\\')) {
      return json({ error: 'Invalid file' }, { status: 400 });
    }

    const target = new URL('/files/upload', apiUrl);
    target.searchParams.set('root', root);

    const upstreamForm = new FormData();
    upstreamForm.set('file', file, file.name);

    const upstream = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(60000)
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return json(
        { error: result.detail ?? 'Upload failed' },
        { status: upstream.status === 409 ? 409 : 502 }
      );
    }

    return json({ success: true, filename: file.name });
  } catch (error) {
    console.error('Direct upload:', error);
    return json({ error: 'Raspberry connection failed' }, { status: 502 });
  }
};
