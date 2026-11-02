
import { PI_AGENT_TOKEN } from '$app/env/private';
import { timingSafeEqual } from 'node:crypto';

export function validAgent(request: Request): boolean {
  const supplied = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${PI_AGENT_TOKEN}`;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  return (
    PI_AGENT_TOKEN.length >= 32 &&
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}
