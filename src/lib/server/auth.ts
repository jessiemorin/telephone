import { AUTH_PASSWORD_HASH, SESSION_SECRET } from '$app/env/private';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'node:crypto';

export const COOKIE_NAME = 'nortel_session';
export const SESSION_DURATION = 60 * 60 * 24 * 7;

function sessionSecret(): string {
  const secret = SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short');
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret())
    .update(payload)
    .digest('hex');
}

export function verifyPassword(password: string): boolean {
const stored = AUTH_PASSWORD_HASH;

  if (!stored || password.length > 1024) return false;

  const [salt, expectedHex] = stored.split(':');

  if (
    !salt ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !expectedHex ||
    !/^[a-f0-9]{128}$/i.test(expectedHex)
  ) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');

  return timingSafeEqual(actual, expected);
}

export function createSession(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const nonce = randomBytes(24).toString('hex');
  const payload = `${expires}.${nonce}`;

  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expires, nonce, signature] = parts;

  if (
    !/^\d+$/.test(expires) ||
    !/^[a-f0-9]{48}$/i.test(nonce) ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = Buffer.from(sign(`${expires}.${nonce}`), 'hex');
  const received = Buffer.from(signature, 'hex');

  return (
    timingSafeEqual(expected, received) &&
    Number(expires) > Math.floor(Date.now() / 1000)
  );
}
