
import { json } from '@sveltejs/kit';
import { validAgent } from '../../../../lib/server/agent.js';
import { redis } from '../../../../lib/server/redis.js';

export async function POST({ request }: { request: Request }) {
  if (!validAgent(request)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);

  if (
    !data ||
    typeof data.id !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(data.id) ||
    data.status !== 'done' ||
    data.message !== 'pong'
  ) {
    return json({ error: 'Invalid result' }, { status: 400 });
  }

  await redis([
    'SET',
    `nortel:result:${data.id}`,
    JSON.stringify({
      status: 'done',
      message: 'pong'
    }),
    'EX',
    300
  ]);

  return json({ ok: true });
}
