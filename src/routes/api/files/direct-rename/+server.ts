import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const ROOTS = ['sounds', 'sounds-kids', 'voicemail'];

function validName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\\\') &&
    /\.(mp3|wav|ogg|m4a)$/i.test(name)
  );
}

export const POST: RequestHandler = async ({ request, locals, url, fetch }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.headers.get('origin') !== url.origin) {
    return json({ error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (
    !body ||
    !ROOTS.includes(body.root) ||
    !validName(body.old_name) || !validName(body.new_name) || body.old_name === body.new_name
  ) {
    return json({ error: 'Invalid request' }, { status: 400 });
  }

    const apiUrl = process.env.NORTEL_API_URL;
  const apiToken = process.env.NORTEL_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return json({ error: 'API not configured' }, { status: 503 });
  }

  try {
    const target = new URL('/files/rename', apiUrl);

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const detail = result.detail;
      return json(
        {
          error: typeof detail === 'string' ? detail : 'Operation failed'
        },
        {
          status: [400, 404, 409].includes(upstream.status)
            ? upstream.status
            : 502
        }
      );
    }

    return json(result);
  } catch (error) {
    console.error('Direct rename:', error);
    return json({ error: 'Raspberry connection failed' }, { status: 502 });
  }
};
