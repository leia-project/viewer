
import { env } from '$env/dynamic/private';

import type { Handle } from '@sveltejs/kit';

const configUrl = env.CONFIG_URL;

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (configUrl) {
		event.locals.configSettings = {
			configUrl: configUrl
		}
	}

	const response = await resolve(event);
	return response;
}
