
import { json } from '@sveltejs/kit';
import { validAgent } from '../../../../lib/server/agent.js';
import { redis } from '../../../../lib/server/redis.js';

export async function POST({ request }: { request: Request }) {
  if (!validAgent(request)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const command = await redis(['RPOP', 'nortel:commands']);

  return json({
    command: command ? JSON.parse(command) : null
  });
}
