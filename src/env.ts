import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  AUTH_PASSWORD_HASH: {},
  SESSION_SECRET: {}
});
