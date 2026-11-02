import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  AUTH_PASSWORD_HASH: {},
  SESSION_SECRET: {},
  PI_AGENT_TOKEN: {},
  KV_REST_API_URL: {},
  KV_REST_API_TOKEN: {}
});
