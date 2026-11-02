
import { json } from '@sveltejs/kit';
import { redis } from '../../../../lib/server/redis.js';

export async function GET({ url, locals }: {
  url: URL;
  locals: App.Locals;
}) {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = url.searchParams.get('id');

  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    return json({ error: 'Invalid ID' }, { status: 400 });
  }

  const result = await redis(['GET', `nortel:result:${id}`]);

  return json(result ? JSON.parse(result) : { status: 'pending' });
}
