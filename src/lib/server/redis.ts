import {
  KV_REST_API_URL,
  KV_REST_API_TOKEN
} from '$app/env/private';

export async function redis(command: (string | number)[]) {
  const response = await fetch(KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Redis HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Redis: ${data.error}`);
  }

  return data.result;
}
