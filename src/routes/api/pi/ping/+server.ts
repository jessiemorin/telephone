
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { redis } from '../../../../lib/server/redis.js';

export async function POST({ locals }: { locals: App.Locals }) {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = randomUUID();

  await redis([
    'LPUSH',
    'nortel:commands',
    JSON.stringify({ id, type: 'ping' })
  ]);

  // Évite une accumulation de commandes si le Pi est hors ligne.
  await redis(['EXPIRE', 'nortel:commands', 300]);

  return json({ id, status: 'queued' });
}
